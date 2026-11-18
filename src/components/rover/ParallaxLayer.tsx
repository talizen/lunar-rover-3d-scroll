import type { ReactNode } from "react"

type ParallaxLayerProps = {
  /** Scroll progress (0–1) at which this layer sits exactly at its home position */
  at: number
  /** How many viewport heights the layer travels over the full scroll; different speeds create the parallax */
  speed: number
  className?: string
  children: ReactNode
}

/** One parallax text layer. The 3D frame loop writes its transform directly from data-at / data-speed, without React re-renders */
export function ParallaxLayer({ at, speed, className = "", children }: ParallaxLayerProps) {
  // Where the layer should be on the first screen (scroll progress 0). Server rendering and the moment
  // before the script loads rely on this, otherwise every layer would flash at its home position;
  // once the scene starts, the frame loop takes over the same transform
  const initial = { transform: `translate3d(0, ${(at * speed * 100).toFixed(2)}vh, 0)` }
  return (
    <div data-at={at} data-speed={speed} style={initial} className={`absolute will-change-transform ${className}`}>
      {children}
    </div>
  )
}
