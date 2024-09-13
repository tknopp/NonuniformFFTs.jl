var documenterSearchIndex = {"docs":
[{"location":"accuracy/#Accuracy","page":"Accuracy","title":"Accuracy","text":"","category":"section"},{"location":"accuracy/","page":"Accuracy","title":"Accuracy","text":"Here we document the accuracy of the NUFFTs implemented in this package, and how it varies as a function of the kernel half-width M, the oversampling factor σ and the choice of spreading kernel.","category":"page"},{"location":"accuracy/","page":"Accuracy","title":"Accuracy","text":"details: Code for generating this figure\nusing NonuniformFFTs\nusing AbstractFFTs: fftfreq\nusing Random: Random\nusing CairoMakie\n\nCairoMakie.activate!(type = \"svg\", pt_per_unit = 2.0)\n\n# Compute L² distance between two arrays.\nfunction l2_error(us, vs)\n    err = sum(zip(us, vs)) do (u, v)\n        abs2(u - v)\n    end\n    norm = sum(abs2, vs)\n    sqrt(err / norm)\nend\n\nN = 256     # number of Fourier modes\nNp = 2 * N  # number of non-uniform points\n\n# Generate some non-uniform random data\nT = Float64\nrng = Random.Xoshiro(42)\nxp = rand(rng, T, Np) .* 2π      # non-uniform points in [0, 2π]\nvp = randn(rng, Complex{T}, Np)  # complex random values at non-uniform points\n\n# Compute \"exact\" non-uniform transform\nks = fftfreq(N, N)  # Fourier wavenumbers\nûs_exact = zeros(Complex{T}, length(ks))\nfor (i, k) ∈ pairs(ks)\n    ûs_exact[i] = sum(zip(xp, vp)) do (x, v)\n        v * cis(-k * x)\n    end\nend\n\nûs = Array{Complex{T}}(undef, length(ks))  # output of type-1 transforms\nσs = (1.25, 1.5, 2.0)  # oversampling factors to be tested\nMs = 2:12              # kernel half-widths to be tested\nkernels = (            # kernels to be tested\n    BackwardsKaiserBesselKernel(),  # this is the default kernel\n    KaiserBesselKernel(),\n    GaussianKernel(),\n    BSplineKernel(),\n)\n\nerrs = Array{Float64}(undef, length(Ms), length(kernels), length(σs))\n\nfor (k, σ) ∈ pairs(σs), (j, kernel) ∈ pairs(kernels), (i, M) ∈ pairs(Ms)\n    plan = PlanNUFFT(Complex{T}, N; m = HalfSupport(M), σ, kernel)\n    set_points!(plan, xp)\n    exec_type1!(ûs, plan, vp)\n    errs[i, j, k] = l2_error(ûs, ûs_exact)\nend\n\nfig = Figure(size = (450, 1000))\naxs = ntuple(3) do k\n    σ = σs[k]\n    ax = Axis(\n        fig[k, 1];\n        yscale = log10, xlabel = L\"Kernel half width $M$\", ylabel = L\"$L^2$ error\",\n        title = L\"Oversampling factor $σ = %$(σ)$\",\n    )\n    ax.xticks = Ms\n    ax.yticks = LogTicks(-14:2:0)\n    for (j, kernel) ∈ pairs(kernels)\n        l = scatterlines!(ax, Ms, errs[:, j, k]; label = string(typeof(kernel)))\n        if kernel isa BackwardsKaiserBesselKernel  # default kernel\n            # Make sure this curve is on top\n            translate!(l, 0, 0, 10)\n        else\n            # Use an open marker for the non-default kernels\n            l.strokewidth = 1\n            l.strokecolor = l.color[]\n            l.markercolor = :transparent\n        end\n    end\n    kw_line = (linestyle = :dash, color = :grey)\n    kw_text = (color = :grey, fontsize = 12)\n    if σ ≈ 1.25\n        let xs = 3.5:11.5, ys = @. 10.0^(-0.5 * xs - 1)\n            lines!(ax, xs, ys; kw_line...)\n            text!(ax, xs[3end÷5], ys[3end÷5]; text = L\"∼10^{-0.5 M}\", align = (:right, :top), kw_text...)\n        end\n        let xs = 2.5:8.5, ys = @. 10.0^(-1.3 * xs - 0)\n            lines!(ax, xs, ys; kw_line...)\n            text!(ax, xs[3end÷5], ys[3end÷5]; text = L\"∼10^{-1.3 M}\", align = (:right, :top), kw_text...)\n        end\n    elseif σ ≈ 1.5\n        let xs = 3.5:11.5, ys = @. 10.0^(-0.7 * xs - 1)\n            lines!(ax, xs, ys; kw_line...)\n            text!(ax, xs[3end÷5], ys[3end÷5]; text = L\"∼10^{-0.7 M}\", align = (:right, :top), kw_text...)\n        end\n        let xs = 2.5:7.5, ys = @. 10.0^(-1.6 * xs - 0.5)\n            lines!(ax, xs, ys; kw_line...)\n            text!(ax, xs[3end÷4], ys[3end÷4]; text = L\"∼10^{-1.6 M}\", align = (:right, :top), kw_text...)\n        end\n    elseif σ ≈ 2.0\n        let xs = 3.5:11.5, ys = @. 10.0^(-xs - 1)\n            lines!(ax, xs, ys; kw_line...)\n            text!(ax, xs[3end÷5], ys[3end÷5]; text = L\"∼10^{-M}\", align = (:right, :top), kw_text...)\n        end\n        let xs = 2.5:6.5, ys = @. 10.0^(-2 * xs)\n            lines!(ax, xs, ys; kw_line...)\n            text!(ax, xs[3end÷5], ys[3end÷5]; text = L\"∼10^{-2M}\", align = (:right, :top), kw_text...)\n        end\n    end\n    ax\nend\nlegend_kw = (; labelsize = 10, rowgap = -4, framewidth = 0.5,)\naxislegend(axs[begin]; position = (0, 0), legend_kw...)\naxislegend(axs[end]; legend_kw...)\nlinkxaxes!(axs...)\nlinkyaxes!(axs...)\nsave(\"accuracy.svg\", fig; pt_per_unit = 2.0)\nnothing  # hide","category":"page"},{"location":"accuracy/","page":"Accuracy","title":"Accuracy","text":"(Image: NUFFT accuracy for choice of parameters.)","category":"page"},{"location":"accuracy/","page":"Accuracy","title":"Accuracy","text":"In all cases, the convergence with respect to the spreading half-width M is exponential, but the actual convergence rate depends on the chosen kernel function and on the oversampling factor σ. The straight dashed lines in the figure above are just an indication allowing to estimate the rate of exponential convergence of the different kernels as M is increased. Clearly, the BackwardsKaiserBesselKernel (default) and KaiserBesselKernel are those which display the best convergence rates and the smallest errors for a given M. Note that the evaluation of both these kernels is highly optimised using basically the same techniques originally proposed for FINUFFT (that is, an accurate piecewise polynomial approximation of the kernel function).","category":"page"},{"location":"accuracy/","page":"Accuracy","title":"Accuracy","text":"In conclusion, there is usually no reason for changing the default kernel (BackwardsKaiserBesselKernel).","category":"page"},{"location":"#NonuniformFFTs.jl","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"Yet another package for computing multidimensional non-uniform fast Fourier transforms (NUFFTs) in Julia.","category":"page"},{"location":"#Installation","page":"NonuniformFFTs.jl","title":"Installation","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"NonuniformFFTs.jl can be simply installed from the Julia REPL with:","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"julia> ] add NonuniformFFTs","category":"page"},{"location":"#Conventions","page":"NonuniformFFTs.jl","title":"Conventions","text":"","category":"section"},{"location":"#Transform-definitions","page":"NonuniformFFTs.jl","title":"Transform definitions","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"This package evaluates type-1 (non-uniform to uniform) and type-2 (uniform to non-uniform) non-uniform fast Fourier transforms (NUFFTs). These are sometimes also called the adjoint and direct NUFFTs, respectively.","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"In one dimension, the type-1 NUFFT computed by this package is defined as follows:","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"u(k) = _j = 1^M v_j  e^-i k x_j\nquad text for  quad\nk = -fracN2  fracN2 - 1","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"where the x_j  0 2π) are the non-uniform points and the v_j are the input values at those points, and k are the associated Fourier wavenumbers (or frequencies). Here M is the number of non-uniform points, and N is the number of Fourier modes that are kept (taken to be even here, but can also be odd).","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"Similarly, the type-2 NUFFT is defined as:","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"v_j = _k = -N2^N2 + 1 u(k)  e^+i k x_j","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"for x_j  0 2π). The type-2 transform can be interpreted as an interpolation of a Fourier series onto a given location.","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"If the points are uniformly distributed in 0 2π), i.e. x_j = 2π (j - 1)  M, then these definitions exactly correspond to the forward and backward DFTs computed by FFTW. Note in particular that the type-1 transform is not normalised. In applications, one usually wants to normalise the obtained Fourier coefficients by the size N of the transform (see examples below).","category":"page"},{"location":"#Ordering-of-data-in-frequency-space","page":"NonuniformFFTs.jl","title":"Ordering of data in frequency space","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"This package follows the FFTW convention of storing frequency-space data starting from the non-negative frequencies (k = 0 1  N2 - 1), followed by the negative frequencies (k = -N2  -2 -1). Note that this package also allows the non-uniform data (v_j values) to be purely real, in which case real-to-complex FFTs are performed and only the non-negative wavenumbers are kept (in one dimension).","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"One can use the fftfreq function from the AbstractFFTs package to conveniently obtain the Fourier frequencies in the right order. For real data transforms, rfftfreq should be used instead.","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"Alternatively, for complex non-uniform data, one can use fftshift and ifftshift from the same package to switch between this convention and the more \"natural\" convention of storing frequencies in increasing order (k = -N2  N2 - 1).","category":"page"},{"location":"#Basic-usage","page":"NonuniformFFTs.jl","title":"Basic usage","text":"","category":"section"},{"location":"#Type-1-(or-*adjoint*)-NUFFT-in-one-dimension","page":"NonuniformFFTs.jl","title":"Type-1 (or adjoint) NUFFT in one dimension","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"using NonuniformFFTs\nusing AbstractFFTs: rfftfreq  # can be used to obtain the associated Fourier wavenumbers\n\nN = 256   # number of Fourier modes\nNp = 100  # number of non-uniform points\nks = rfftfreq(N, N)  # Fourier wavenumbers\n\n# Generate some non-uniform random data\nT = Float64             # non-uniform data is real (can also be complex)\nxp = rand(T, Np) .* 2π  # non-uniform points in [0, 2π]\nvp = randn(T, Np)       # random values at points\n\n# Create plan for data of type T\nplan_nufft = PlanNUFFT(T, N; m = HalfSupport(8))  # larger support increases accuracy\n\n# Set non-uniform points\nset_points!(plan_nufft, xp)\n\n# Perform type-1 NUFFT on preallocated output\nûs = Array{Complex{T}}(undef, size(plan_nufft))\nexec_type1!(ûs, plan_nufft, vp)\n@. ûs = ûs / N  # normalise transform","category":"page"},{"location":"#Type-2-(or-*direct*)-NUFFT-in-one-dimension","page":"NonuniformFFTs.jl","title":"Type-2 (or direct) NUFFT in one dimension","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"using NonuniformFFTs\n\nN = 256   # number of Fourier modes\nNp = 100  # number of non-uniform points\n\n# Generate some uniform random data\nT = Float64                        # non-uniform data is real (can also be complex)\nxp = rand(T, Np) .* 2π             # non-uniform points in [0, 2π]\nûs = randn(Complex{T}, N ÷ 2 + 1)  # random values at points (we need to store roughly half the Fourier modes for complex-to-real transform)\n\n# Create plan for data of type T\nplan_nufft = PlanNUFFT(T, N; m = HalfSupport(8))\n\n# Set non-uniform points\nset_points!(plan_nufft, xp)\n\n# Perform type-2 NUFFT on preallocated output\nvp = Array{T}(undef, Np)\nexec_type2!(vp, plan_nufft, ûs)","category":"page"},{"location":"#Multidimensional-transforms","page":"NonuniformFFTs.jl","title":"Multidimensional transforms","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"using NonuniformFFTs\nusing StaticArrays: SVector  # for convenience\n\nNs = (256, 256)  # number of Fourier modes in each direction\nNp = 1000        # number of non-uniform points\n\n# Generate some non-uniform random data\nT = Float64                                   # non-uniform data is real (can also be complex)\nd = length(Ns)                                # number of dimensions (d = 2 here)\nxp = [2π * rand(SVector{d, T}) for _ ∈ 1:Np]  # non-uniform points in [0, 2π]ᵈ\nvp = randn(T, Np)                             # random values at points\n\n# Create plan for data of type T\nplan_nufft = PlanNUFFT(T, Ns; m = HalfSupport(8))\n\n# Set non-uniform points\nset_points!(plan_nufft, xp)\n\n# Perform type-1 NUFFT on preallocated output\nûs = Array{Complex{T}}(undef, size(plan_nufft))\nexec_type1!(ûs, plan_nufft, vp)\nûs ./= prod(Ns)  # normalise transform\n\n# Perform type-2 NUFFT on preallocated output\nexec_type2!(vp, plan_nufft, ûs)","category":"page"},{"location":"#Multiple-transforms-on-the-same-non-uniform-points","page":"NonuniformFFTs.jl","title":"Multiple transforms on the same non-uniform points","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"using NonuniformFFTs\n\nN = 256   # number of Fourier modes\nNp = 100  # number of non-uniform points\nntrans = Val(3)  # number of simultaneous transforms\n\n# Generate some non-uniform random data\nT = Float64             # non-uniform data is real (can also be complex)\nxp = rand(T, Np) .* 2π  # non-uniform points in [0, 2π]\nvp = ntuple(_ -> randn(T, Np), ntrans)  # random values at points (one vector per transformed quantity)\n\n# Create plan for data of type T\nplan_nufft = PlanNUFFT(T, N; ntransforms = ntrans)\n\n# Set non-uniform points\nset_points!(plan_nufft, xp)\n\n# Perform type-1 NUFFT on preallocated output (one array per transformed quantity)\nûs = ntuple(_ -> Array{Complex{T}}(undef, size(plan_nufft)), ntrans)\nexec_type1!(ûs, plan_nufft, vp)\n@. ûs = ûs / N  # normalise transform\n\n# Perform type-2 NUFFT on preallocated output (one vector per transformed quantity)\nvp_interp = map(similar, vp)\nexec_type2!(vp, plan_nufft, ûs)","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"More details on optional parameters and on tuning accuracy is coming soon.","category":"page"},{"location":"#Differences-with-other-packages","page":"NonuniformFFTs.jl","title":"Differences with other packages","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"This package roughly follows the same notation and conventions of the FINUFFT library and its Julia interface, with a few differences detailed below.","category":"page"},{"location":"#Conventions-used-by-this-package","page":"NonuniformFFTs.jl","title":"Conventions used by this package","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"We try to preserve as much as possible the conventions used in FFTW3. In particular, this means that:","category":"page"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"The FFT outputs are ordered starting from mode k = 0 to k = N2 - 1 (for even N) and then from -N2 to -1. Wavenumbers can be obtained in this order by calling AbstractFFTs.fftfreq(N, N). Use AbstractFFTs.fftshift to get Fourier modes in increasing order -N2  -1 0 1  N2 - 1. In FINUFFT, one should set modeord = 1 to get this order.\nThe type-1 NUFFT (non-uniform to uniform) is defined with a minus sign in the exponential. This is the same convention as the forward DFT in FFTW3. In particular, this means that performing a type-1 NUFFT on uniform points gives the same output than performing a FFT using FFTW3. In FINUFFT, this corresponds to setting iflag = -1 in type-1 transforms. Conversely, type-2 NUFFTs (uniform to non-uniform) are defined with a plus sign, equivalently to the backward DFT in FFTW3.","category":"page"},{"location":"#Differences-with-[NFFT.jl](https://github.com/JuliaMath/NFFT.jl)","page":"NonuniformFFTs.jl","title":"Differences with NFFT.jl","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"This package allows changing the non-uniform points associated to a NUFFT plan. In other words, once a plan already exists, computing a NUFFT for a different set of points is efficient and doesn't need to allocate a new plan.\nThis package allows NUFFTs of purely real non-uniform data.\nDifferent convention is used: non-uniform points are expected to be in 0 2π.\nThis package allows performing transforms of multiple quantities at the same non-uniform values at once.","category":"page"},{"location":"#Differences-with-FINUFFT-/-FINUFFT.jl","page":"NonuniformFFTs.jl","title":"Differences with FINUFFT / FINUFFT.jl","text":"","category":"section"},{"location":"","page":"NonuniformFFTs.jl","title":"NonuniformFFTs.jl","text":"This package is written in \"pure\" Julia (besides the FFTs themselves which rely on the FFTW3 library, via their Julia interface).\nThis package allows NUFFTs of purely real non-uniform data. Moreover, transforms can be performed in for an arbitrary number of dimensions.\nA different smoothing kernel function is used (backwards Kaiser–Bessel kernel by default).\nIt is possible to use the same plan for type-1 and type-2 transforms, reducing memory requirements in cases where one wants to perform both.","category":"page"},{"location":"API/#API","page":"API","title":"API","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"CurrentModule = NonuniformFFTs","category":"page"},{"location":"API/#Creating-plans","page":"API","title":"Creating plans","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"PlanNUFFT","category":"page"},{"location":"API/#NonuniformFFTs.PlanNUFFT","page":"API","title":"NonuniformFFTs.PlanNUFFT","text":"PlanNUFFT([T = ComplexF64], dims::Dims; ntransforms = Val(1), kwargs...)\n\nConstruct a plan for performing non-uniform FFTs (NUFFTs).\n\nThe created plan contains all data needed to perform NUFFTs for non-uniform data of type T (ComplexF64 by default) and uniform data with dimensions dims.\n\nOptional keyword arguments\n\nntransforms = Val(1): the number of simultaneous transforms to perform. This is useful if one wants to transform multiple scalar quantities at the same non-uniform points.\n\nNUFFT parameters\n\nm = HalfSupport(8): the half-support of the convolution kernels. Large values increase accuracy at the cost of performance.\nσ = 2.0: NUFFT oversampling factor. Typical values are 2.0 (more accurate) and 1.25 (faster), but other values such as 1.5 should also work.\nkernel::AbstractKernel = BackwardsKaiserBesselKernel(): convolution kernel used for NUFFTs.\n\nPerformance parameters\n\nblock_size = 4096: the linear block size (in number of elements) when using block partitioning. This can be tuned for maximal performance. Using block partitioning is required for running with multiple threads. Blocking can be completely disabled by passing block_size = nothing (but this is generally slower, even when running on a single thread).\nsort_points = False(): whether to internally permute the order of the non-uniform points. This can be enabled by passing sort_points = True(). In this case, more time will be spent in set_points! and less time on the actual transforms. This can improve performance if executing multiple transforms on the same non-uniform points. Note that, even when enabled, this does not modify the points argument passed to set_points!.\n\nOther parameters\n\nfftw_flags = FFTW.MEASURE: parameters passed to the FFTW planner.\ntimer = TimerOutput(): allows to specify a TimerOutput (from the TimerOutputs.jl package) where timing information will be written to. By default the plan creates its own timer. One can visualise the time spent on different parts of the NUFFT computation using p.timer.\n\nUsing real non-uniform data\n\nIn some applications, the non-uniform data to be transformed is purely real. In this case, one may pass Float64 or Float32 as the first argument. This may be faster than converting data to complex types, in particular because the real-to-complex FFTs from FFTW will be used to compute the transforms. Note that, in this case, the dimensions of the uniform data arrays is not exactly dims, since the size of the first dimension is divided roughly by 2 (taking advantage of Hermitian symmetry). For convenience, one can call size(::PlanNUFFT) on the constructed plan to know in advance the dimensions of the uniform data arrays.\n\n\n\n\n\n","category":"type"},{"location":"API/#Setting-non-uniform-points","page":"API","title":"Setting non-uniform points","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"set_points!","category":"page"},{"location":"API/#NonuniformFFTs.set_points!","page":"API","title":"NonuniformFFTs.set_points!","text":"set_points!(p::PlanNUFFT, points)\n\nSet non-uniform points before executing a NUFFT.\n\nIn one dimension, points is simply a vector of real values (the non-uniform locations).\n\nIn multiple dimensions, points may be passed as:\n\na tuple of vectors (xs::AbstractVector, ys::AbstractVector, …),\na vector [x⃗₁, x⃗₂, x⃗₃, x⃗₄, …] of tuples or static vectors (typically SVectors from the StaticArrays.jl package).\n\nThe points are allowed to be outside of the periodic cell 0 2π)^d, in which case they will be \"folded\" to that domain.\n\n\n\n\n\n","category":"function"},{"location":"API/#Executing-plans","page":"API","title":"Executing plans","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"exec_type1!\nexec_type2!","category":"page"},{"location":"API/#NonuniformFFTs.exec_type1!","page":"API","title":"NonuniformFFTs.exec_type1!","text":"exec_type1!(ûs::AbstractArray{<:Complex}, p::PlanNUFFT, vp::AbstractVector{<:Number})\nexec_type1!(ûs::NTuple{N, AbstractArray{<:Complex}}, p::PlanNUFFT, vp::NTuple{N, AbstractVector{<:Number}})\n\nPerform type-1 NUFFT (from non-uniform points to uniform grid).\n\nHere vp contains the input values at non-uniform points. The result of the transform is written into ûs.\n\nOne first needs to set the non-uniform points using set_points!.\n\nTo perform multiple transforms at once, both vp and ûs should be a tuple of arrays (second variant above). Note that this requires a plan initialised with ntransforms = Val(N) (see PlanNUFFT).\n\nSee also exec_type2!.\n\n\n\n\n\n","category":"function"},{"location":"API/#NonuniformFFTs.exec_type2!","page":"API","title":"NonuniformFFTs.exec_type2!","text":"exec_type2!(vp::AbstractVector{<:Number}, p::PlanNUFFT, ûs::AbstractArray{<:Complex})\nexec_type2!(vp::NTuple{N, AbstractVector{<:Number}}, p::PlanNUFFT, ûs::NTuple{N, AbstractArray{<:Complex}})\n\nPerform type-2 NUFFT (from uniform grid to non-uniform points).\n\nHere ûs contains the input coefficients in the uniform grid. The result of the transform at non-uniform points is written into vp.\n\nOne first needs to set the non-uniform points using set_points!.\n\nTo perform multiple transforms at once, both vp and ûs should be a tuple of arrays (second variant above). Note that this requires a plan initialised with ntransforms = Val(N) (see PlanNUFFT).\n\nSee also exec_type1!.\n\n\n\n\n\n","category":"function"},{"location":"API/#Other-functions","page":"API","title":"Other functions","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"size(::PlanNUFFT)","category":"page"},{"location":"API/#Base.size-Tuple{PlanNUFFT}","page":"API","title":"Base.size","text":"size(p::PlanNUFFT) -> (N₁, N₂, ...)\n\nReturn the dimensions of arrays containing uniform values.\n\nThis corresponds to the number of Fourier modes in each direction (in the non-oversampled grid).\n\n\n\n\n\n","category":"method"},{"location":"API/#Available-spreading-kernels","page":"API","title":"Available spreading kernels","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"KaiserBesselKernel\nBackwardsKaiserBesselKernel\nGaussianKernel\nBSplineKernel","category":"page"},{"location":"API/#NonuniformFFTs.Kernels.KaiserBesselKernel","page":"API","title":"NonuniformFFTs.Kernels.KaiserBesselKernel","text":"KaiserBesselKernel <: AbstractKernel\nKaiserBesselKernel()\n\nRepresents a Kaiser–Bessel spreading kernel.\n\nDefinition\n\nϕ(x) = fracI₀ left(β sqrt1 - x² right)I₀(β)\nquad text for  x  1\n\nwhere I₀ is the zeroth-order modified Bessel function of the first kind and β is a shape factor.\n\nFourier transform\n\nϕ(k) = frac2I₀(β) fracsinhleft( sqrtβ² - k² right)sqrtβ² - k²\n\nParameter selection\n\nThe shape parameter is chosen to be [1]\n\nβ = γ M π left( 2 - frac1σ right)\n\nwhere M is the kernel half-width and σ the oversampling factor. Moreover, γ = 0980 is an empirical \"safety factor\", similarly to the one used by FINUFFT [2], which slightly improves accuracy.\n\nImplementation details\n\nSince the evaluation of Bessel functions can be costly, this kernel is efficiently evaluated via an accurate piecewise polynomial approximation. We use the same method originally proposed for FINUFFT [2] and later discussed by Shamshirgar et al. [3].\n\n[1] Potts & Steidl, SIAM J. Sci. Comput. 24, 2013 (2003) \n[2] Barnett, Magland & af Klinteberg, SIAM J. Sci. Comput. 41, C479 (2019) \n[3] Shamshirgar, Bagge & Tornberg, J. Chem. Phys. 154, 164109 (2021)\n\n\n\n\n\n","category":"type"},{"location":"API/#NonuniformFFTs.Kernels.BackwardsKaiserBesselKernel","page":"API","title":"NonuniformFFTs.Kernels.BackwardsKaiserBesselKernel","text":"BackwardsKaiserBesselKernel <: AbstractKernel\nBackwardsKaiserBesselKernel()\n\nRepresents a backwards Kaiser–Bessel (KB) spreading kernel.\n\nThis kernel basically results from swapping the KaiserBesselKernel spreading function and its Fourier transform. It has very similar properties to the Kaiser–Bessel kernel.\n\nDefinition\n\nϕ(x) = frac1sinh(β) fracsinh left(β sqrt1 - x² right)sqrt1 - x²\nquad text for  x  1\n\nwhere β is a shape factor.\n\nFourier transform\n\nϕ(k) = fracπsinh(β)  I₀ left( sqrtβ² - k² right)\n\nwhere I₀ is the zeroth-order modified Bessel function of the first kind.\n\nParameter selection\n\nThe shape parameter is chosen to be [1]\n\nβ = γ M π left( 2 - frac1σ right)\n\nwhere M is the kernel half-width and σ the oversampling factor. Moreover, γ = 0995 is an empirical \"safety factor\", similarly to the one used by FINUFFT [2], which slightly improves accuracy.\n\nImplementation details\n\nSince the evaluation of the hyperbolic sine functions can be costly, this kernel is efficiently evaluated via an accurate piecewise polynomial approximation. We use the same method originally proposed for FINUFFT [2] and later discussed by Shamshirgar et al. [3].\n\n[1] Potts & Steidl, SIAM J. Sci. Comput. 24, 2013 (2003) \n[2] Barnett, Magland & af Klinteberg, SIAM J. Sci. Comput. 41, C479 (2019) \n[3] Shamshirgar, Bagge & Tornberg, J. Chem. Phys. 154, 164109 (2021)\n\n\n\n\n\n","category":"type"},{"location":"API/#NonuniformFFTs.Kernels.GaussianKernel","page":"API","title":"NonuniformFFTs.Kernels.GaussianKernel","text":"GaussianKernel <: AbstractKernel\nGaussianKernel()\n\nRepresents a truncated Gaussian spreading kernel.\n\nDefinition\n\nϕ(x) = e^-x²  2ℓ²\n\nwhere ℓ is the characteristic width of the kernel.\n\nFourier transform\n\nϕ(k) = sqrt2πσ² e^-ℓ² k²  2\n\nParameter selection\n\nGiven a kernel half-width M, an oversampling factor σ and the oversampling grid spacing Δx, the characteristic width ℓ is chosen as [1]\n\nℓ² = Δx² fracσ2σ - 1 fracMπ\n\nImplementation details\n\nIn the implementation, this kernel is efficiently evaluated using the fast Gaussian gridding method proposed by Greengard & Lee [2].\n\n[1] Potts & Steidl, SIAM J. Sci. Comput. 24, 2013 (2003) \n[2] Greengard & Lee, SIAM Rev. 46, 443 (2004)\n\n\n\n\n\n","category":"type"},{"location":"API/#NonuniformFFTs.Kernels.BSplineKernel","page":"API","title":"NonuniformFFTs.Kernels.BSplineKernel","text":"BSplineKernel <: AbstractKernel\nBSplineKernel()\n\nRepresents a B-spline spreading kernel.\n\nThe order n of the B-spline is directly related to the kernel half-width M by n = 2M (the polynomial degree is n - 1).\n\nDefinition\n\nA B-spline of order n may be defined via its Fourier transform:\n\nϕ(k) = Δx operatornamesinc^n left( frack Δx2 right)\n\nwhere Δx is the spacing of the oversampled grid and operatornamesinc is the unnormalised sinc function.\n\nImplementation details\n\nIn the implementation, this kernel is evaluated using de Boor's algorithm.\n\n\n\n\n\n","category":"type"},{"location":"API/#Index","page":"API","title":"Index","text":"","category":"section"},{"location":"API/","page":"API","title":"API","text":"Pages = [\"API.md\"]","category":"page"}]
}
