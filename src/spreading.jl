"""
    spread_from_point!(gs::NTuple{D, AbstractKernelData}, u::AbstractArray{T, D}, x⃗₀, v)

Spread value `v` at point `x⃗₀` onto neighbouring grid points.

The grid is assumed to be periodic with period ``2π`` in each direction.

The point `x⃗₀` **must** be in ``[0, 2π)^D``.
It may be given as a tuple `x⃗₀ = (x₀, y₀, …)` or similarly as a static vector
(from `StaticArrays.jl`).

One can also pass tuples `v = (v₁, v₂, …)` and `u = (u₁, u₂, …)`,
in which case each value `vᵢ` will be spread to its corresponding array `uᵢ`.
This can be useful for spreading vector fields, for instance.
"""
function spread_from_point!(
        gs::NTuple{D, AbstractKernelData},
        us::NTuple{C, AbstractArray{T, D}} where {T},
        x⃗₀::NTuple{D, Number},
        vs::NTuple{C, Number},
    ) where {C, D}
    map(Base.require_one_based_indexing, us)
    Ns = size(first(us))
    @assert all(u -> size(u) === Ns, us)

    # Evaluate 1D kernels.
    gs_eval = map(Kernels.evaluate_kernel, gs, x⃗₀)

    # Determine indices to write in `u` arrays.
    inds = map(gs_eval, gs, Ns) do gdata, g, N
        Kernels.kernel_indices(gdata.i, g, N)
    end

    vals = map(g -> g.values, gs_eval)
    spread_onto_arrays!(us, inds, vals, vs)

    us
end

function spread_from_points!(
        gs,
        us_all::NTuple{C, AbstractArray},
        x⃗s::AbstractVector,
        vp_all::NTuple{C, AbstractVector},
    ) where {C}
    # Note: the dimensions of arrays have already been checked via check_nufft_nonuniform_data.
    Base.require_one_based_indexing(x⃗s)  # this is to make sure that all indices match
    foreach(Base.require_one_based_indexing, vp_all)
    for i ∈ eachindex(x⃗s)  # iterate over all points
        x⃗ = @inbounds x⃗s[i]
        vs = map(vp -> @inbounds(vp[i]), vp_all)  # non-uniform values at point x⃗
        spread_from_point!(gs, us_all, x⃗, vs)
    end
    us_all
end

function spread_from_point_blocked!(
        gs::NTuple{D, AbstractKernelData},
        us::NTuple{C, AbstractArray{T, D}} where {T},
        x⃗₀::NTuple{D, Number},
        vs::NTuple{C, Number},
        I₀::NTuple,
    ) where {C, D}
    # Evaluate 1D kernels.
    gs_eval = map(Kernels.evaluate_kernel, gs, x⃗₀)

    Ms = map(Kernels.half_support, gs)
    δs = Ms .- I₀  # index offset

    # Determine indices to write in `u` arrays.
    inds = map(gs_eval, gs, δs) do gdata, g, δ
        is = Kernels.kernel_indices(gdata.i, g)  # note: this variant doesn't perform periodic wrapping
        is .+ δ  # shift to beginning of current block
    end
    Is = CartesianIndices(inds)
    # checkbounds.(us, Ref(Is))  # check that indices fall inside the output array

    vals = map(g -> g.values, gs_eval)
    spread_onto_arrays_blocked!(us, Is, vals, vs)

    us
end

function spread_from_points_blocked!(
        gs,
        bd::BlockData,
        us_all::NTuple{C, AbstractArray},
        xp::AbstractVector,
        vp_all::NTuple{C, AbstractVector},
    ) where {C}
    (; block_dims, pointperm, buffers, indices,) = bd
    Ms = map(Kernels.half_support, gs)
    for us ∈ us_all
        fill!(us, zero(eltype(us)))
    end
    Nt = length(buffers)  # usually equal to the number of threads
    # nblocks = length(indices)
    Base.require_one_based_indexing(buffers)
    Base.require_one_based_indexing(indices)
    lck = ReentrantLock()

    Threads.@threads :static for i ∈ 1:Nt
        # j_start = (i - 1) * nblocks ÷ Nt + 1
        # j_end = i * nblocks ÷ Nt
        j_start = bd.blocks_per_thread[i] + 1
        j_end = bd.blocks_per_thread[i + 1]
        block = buffers[i]
        @inbounds for j ∈ j_start:j_end
            a = bd.cumulative_npoints_per_block[j]
            b = bd.cumulative_npoints_per_block[j + 1]
            a == b && continue  # no points in this block (otherwise b > a)

            # Iterate over all points in the current block
            I₀ = indices[j]
            fill_with_zeros_serial!(block)
            for k ∈ (a + 1):b
                l = pointperm[k]
                # @assert bd.blockidx[l] == j  # check that point is really in the current block
                if bd.sort_points === True()
                    x⃗ = xp[k]  # if points have been permuted (may be slightly faster here, but requires permutation in set_points!)
                else
                    x⃗ = xp[l]  # if points have not been permuted
                end
                vs = map(vp -> @inbounds(vp[l]), vp_all)  # values at the non-uniform point x⃗
                spread_from_point_blocked!(gs, block, x⃗, vs, Tuple(I₀))
            end

            # Indices of current block including padding
            Ia = I₀ + oneunit(I₀) - CartesianIndex(Ms)
            Ib = I₀ + CartesianIndex(block_dims) + CartesianIndex(Ms)
            inds_split = split_periodic(Ia, Ib, size(first(us_all)))

            # Add data from block to output array.
            # Note that only one thread can write at a time.
            lock(lck) do
                add_from_block!(us_all, block, inds_split)
            end
        end
    end

    us_all
end

function split_periodic(
        Ia::CartesianIndex{D}, Ib::CartesianIndex{D}, Ns::Dims{D},
    ) where {D}
    ntuple(Val(D)) do j
        split_periodic(Ia[j]:Ib[j], Ns[j])
    end
end

# Split range into two contiguous ranges in 1:N after periodic wrapping.
# We assume the input range only goes outside 1:N either on the left or the right of the
# range (and by less than N values).
# This requires the block size B to be smaller than the dataset size N.
# More exactly, we need B ≤ N - M where M is the half kernel support (= the block padding).
function split_periodic(irange::AbstractUnitRange, N)
    T = typeof(irange)
    if irange[begin] < 1
        # We assume the range includes the 1.
        n = searchsortedlast(irange, 1)
        # @assert n > firstindex(irange) && irange[n] == 1
        a = (irange[begin]:irange[n - 1]) .+ N  # indices [..., N - 1, N]
        b = irange[n]:irange[end]  # indices [1, 2, ...]
    elseif last(irange) > N
        # We assume the range includes N.
        n = searchsortedlast(irange, N)
        # @assert n < lastindex(irange) && irange[n] == N
        a = irange[begin]:irange[n]
        b = (irange[n + 1]:irange[end]) .- N
    else
        # A single contiguous range, plus an empty one.
        a = irange
        b = T(0:-1)  # empty range
    end
    (a, b) :: Tuple{T, T}
end

function add_from_block!(
        us_all::NTuple{C, AbstractArray},
        block::NTuple{C, AbstractArray},
        inds_wrapped::NTuple,
    ) where {C}
    for i ∈ 1:C
        _add_from_block!(us_all[i], block[i], inds_wrapped)
    end
    us_all
end

# Recursively generate a loop over `d` dimensions, where each dimension is split into 2 sets
# of indices.
# This function generates a Julia expression which is included in a @generated function.
function _generate_split_loop_expr(d, inds, loop_core)
    if d == 0
        return loop_core
    end
    jd = Symbol(:j_, d)  # e.g. j_3
    ex_prev = _generate_split_loop_expr(d - 1, inds, loop_core)
    quote
        for $jd ∈ $inds[$d][1]
            $ex_prev
        end
        for $jd ∈ $inds[$d][2]
            $ex_prev
        end
    end
end

function _add_from_block!(
        us::AbstractArray{T, D},
        ws::AbstractArray{T, D},
        inds_wrapped::NTuple{D, NTuple{2, UnitRange}},
    ) where {T, D}
    if @generated
        loop_core = quote
            n += 1
            js = @ntuple $D j
            us[js...] += ws[n]  # us[j_1, j_2, ..., j_D] += ws[n]
        end
        ex_loop = _generate_split_loop_expr(D, :inds_wrapped, loop_core)
        quote
            number_of_indices_per_dimension = @ntuple($D, i -> sum(length, inds_wrapped[i]))
            @assert size(ws) == number_of_indices_per_dimension
            Base.require_one_based_indexing(ws)
            Base.require_one_based_indexing(us)
            n = 0
            @inbounds begin
                $ex_loop
            end
            @assert n == length(ws)
            us
        end
    else
        @assert size(ws) == map(tup -> sum(length, tup), inds_wrapped)
        Base.require_one_based_indexing(ws)
        Base.require_one_based_indexing(us)
        iters = map(enumerate ∘ Iterators.flatten, inds_wrapped)
        iter_first, iters_tail =  first(iters), Base.tail(iters)
        @inbounds for inds_tail ∈ Iterators.product(iters_tail...)
            is_tail = map(first, inds_tail)
            js_tail = map(last, inds_tail)
            for (i, j) ∈ iter_first
                us[j, js_tail...] += ws[i, is_tail...]
            end
        end
        us
    end
end

# TODO: optimise as blocked version, using Base.Cartesian.
function spread_onto_arrays!(
        us::NTuple{C, AbstractArray{T, D}} where {T},
        inds_mapping::NTuple{D, Tuple},
        vals::NTuple{D, Tuple},
        vs::NTuple{C},
    ) where {C, D}
    inds = map(eachindex, inds_mapping)
    inds_first, inds_tail = first(inds), Base.tail(inds)
    vals_first, vals_tail = first(vals), Base.tail(vals)
    imap_first, imap_tail = first(inds_mapping), Base.tail(inds_mapping)
    @inbounds for J_tail ∈ CartesianIndices(inds_tail)
        js_tail = Tuple(J_tail)
        is_tail = map(inbounds_getindex, imap_tail, js_tail)
        gs_tail = map(inbounds_getindex, vals_tail, js_tail)
        gprod_tail = prod(gs_tail)
        for j ∈ inds_first
            i = imap_first[j]
            gprod = gprod_tail * vals_first[j]
            for (u, v) ∈ zip(us, vs)
                u[i, is_tail...] += v * gprod
            end
        end
    end
    us
end

# This is basically the same as the non-blocked version, but uses CartesianIndices instead
# of tuples (since indices don't "jump" due to periodic wrapping).
function spread_onto_arrays_blocked!(
        us::NTuple{C, AbstractArray{T, D}},
        Is::CartesianIndices{D},
        vals::NTuple{D, Tuple},
        vs::NTuple{C, T},
    ) where {C, T, D}
    # NOTE: When C > 1, we found that we gain nothing (in terms of performance) by combining
    # operations over C arrays at once. Things actually get much slower for some reason.
    # So we simply perform the same operation C times.
    for i ∈ 1:C
        _spread_onto_arrays_blocked!(us[i], Is, vals, vs[i])
    end
    us
end

function _spread_onto_arrays_blocked!(
        u::AbstractArray{T, D},
        Is::CartesianIndices{D},
        vals::NTuple{D, Tuple},
        v::T,
    ) where {T, D}
    if @generated
        gprod_init = Symbol(:gprod_, D)  # the name of this variable is important!
        quote
            inds = map(eachindex, vals)
            $gprod_init = v
            @inbounds @nloops(
                $(D - 1),
                i,
                d -> inds[d + 1],  # for i_d ∈ inds[d + 1]
                d -> begin
                    gprod_d = gprod_{d + 1} * vals[d + 1][i_d]  # add factor for dimension d + 1
                end,
                begin
                    is_tail = @ntuple $(D - 1) i
                    I₀ = Is[inds[1][1], is_tail...]
                    n = LinearIndices(u)[I₀]
                    for i_0 ∈ inds[1]
                        gprod_0 = gprod_1 * vals[1][i_0]
                        u[n] += gprod_0
                        n += 1
                    end
                end,
            )
            u
        end
    else
        inds = map(eachindex, vals)
        Js = CartesianIndices(inds)
        @inbounds for J ∈ Js
            gs = map(inbounds_getindex, vals, Tuple(J))
            gprod = v * prod(gs)
            I = Is[J]
            u[I] += gprod
        end
        u
    end
end
