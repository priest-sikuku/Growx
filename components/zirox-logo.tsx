interface ZiroxLogoProps {
  size?: "sm" | "md" | "lg"
}

export function ZiroxLogo({ size = "md" }: ZiroxLogoProps) {
  const sizeClasses = {
    sm: "text-lg sm:text-xl md:text-2xl p-1.5 sm:p-2",
    md: "text-xl sm:text-2xl md:text-3xl p-2 sm:p-2.5",
    lg: "text-3xl sm:text-4xl md:text-5xl p-3 sm:p-4",
  }

  return (
    <div className="flex items-center">
      {/* Logo container - compact and left-aligned */}
      <div className="relative">
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-green-500 to-black rounded-md blur-lg opacity-40 animate-pulse"></div>

        {/* Logo */}
        <div
          className={`relative bg-gradient-to-br from-yellow-300 via-green-500 to-black rounded-md ${sizeClasses[size]} shadow-lg`}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 rounded-md animate-shimmer"></div>

          {/* Logo text - compact sizing */}
          <div className="relative">
            <h1
              className={`${sizeClasses[size].split(" ")[0]} font-black bg-gradient-to-r from-yellow-200 via-green-300 to-white bg-clip-text text-transparent drop-shadow-lg`}
            >
              ZiroX
            </h1>
          </div>
        </div>
      </div>
    </div>
  )
}
