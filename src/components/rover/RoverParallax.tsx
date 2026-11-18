import { useEffect, useRef, useState } from "react"
import { ParallaxLayer } from "./ParallaxLayer"
import { startScene } from "./engine/scene"

type RoverParallaxProps = {
  kicker?: string
  paragraph?: string
  turntableNote?: string
  pbrNote?: string
  ending?: string
  endingNote?: string
  /** Total scroll length of the page, in viewport heights */
  scrollScreens?: 5 | 7 | 9
}

const TRACK_HEIGHT = { 5: "h-[500vh]", 7: "h-[700vh]", 9: "h-[900vh]" } as const
const HERO_BOX = "left-1/2 ml-[calc(min(86vw,1180px)/-2)] w-[min(86vw,1180px)] text-center"
const MONO = "font-mono font-bold leading-none"
const NOTE = "text-[clamp(13px,1.35vw,21px)] font-extrabold leading-[1.45] max-md:w-[42vw]"
const NOTE_TAG = `mb-[.9em] block text-[.72em] tracking-[.3em] ${MONO}`
const VERTICAL = "top-1/2 text-[clamp(34px,6.4vw,104px)] font-black leading-none tracking-[.04em] [writing-mode:vertical-rl] max-md:text-[11vw]"

/**
 * Black type on red, plus a small survey rover built entirely in code.
 * Scroll down: it drives across the Moon while turning a full circle, the camera pushes in on its eye, and it blinks.
 */
export function RoverParallax({
  kicker = "SV-54 · A SURVEY ROVER THAT NEVER CLOCKED OUT",
  paragraph = "The mission ended long ago, but one small rover kept driving. Every day it maps another mile of the Moon, plants a beacon and sends home a report no one reads. Scroll to walk once around it — then lean in and look it in the eye.",
  turntableNote = "One full turn. Not a single texture is painted: the scratches are computed normals, the dust grows out of a noise function.",
  pbrNote = "Metalness, roughness, micro-scratch normals — and a studio light rig built entirely in code.",
  ending = "It blinked.",
  endingNote = "FIN · STILL DRIVING ACROSS THE MOON",
  scrollScreens = 7,
}: RoverParallaxProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    // The scene only starts in the browser; the returned cleanup stops the frame loop and frees GPU resources
    return startScene(canvas, root, () => setWebglFailed(true))
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative bg-[#d8161b] font-['Helvetica_Neue',Inter,Arial,system-ui,sans-serif] text-[#0b0b0b] antialiased"
    >
      {/* The page itself only provides scroll distance; everything visible lives in fixed layers */}
      <div className={TRACK_HEIGHT[scrollScreens]} />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_90%_at_50%_45%,#e31b20_0%,#d8161b_55%,#b50f14_100%)]" />

      {/* Back layers: behind the rover */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <ParallaxLayer at={0} speed={3.6} className={`top-[15vh] text-[clamp(11px,1.05vw,15px)] tracking-[.42em] ${HERO_BOX} ${MONO}`}>
          {kicker}
        </ParallaxLayer>
        <ParallaxLayer at={0} speed={2.5} className={`top-1/2 text-[clamp(20px,3.1vw,50px)] font-black leading-[1.08] tracking-[-.02em] ${HERO_BOX}`}>
          <p className="-translate-y-1/2 text-justify [text-align-last:center]">{paragraph}</p>
        </ParallaxLayer>
        <ParallaxLayer at={0.36} speed={3} className="inset-x-0 top-1/2 -mt-[19.5vw] whitespace-nowrap text-center font-['Helvetica_Neue',Arial,sans-serif] text-[39vw] font-black leading-none tracking-[-.05em]">
          360°
        </ParallaxLayer>
        <ParallaxLayer at={0.36} speed={3.6} className={`left-[6vw] top-[81vh] w-[min(25vw,360px)] ${NOTE}`}>
          <b className={NOTE_TAG}>01 / TURNTABLE</b>
          {turntableNote}
        </ParallaxLayer>
        <ParallaxLayer at={0.38} speed={3.1} className={`right-[6vw] top-[7vh] w-[min(22vw,320px)] text-right ${NOTE}`}>
          <b className={NOTE_TAG}>02 / PBR</b>
          {pbrNote}
        </ParallaxLayer>
        <ParallaxLayer at={0.72} speed={2.6} className={`left-[5vw] -mt-[3.2em] ${VERTICAL}`}>
          CLOSER
        </ParallaxLayer>
        <ParallaxLayer at={0.76} speed={3.6} className={`right-[5vw] -mt-[1.2em] ${VERTICAL}`}>
          STILL
        </ParallaxLayer>
      </div>

      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[2] block h-full w-full" />

      {/* Front layers: in front of the rover */}
      <div className="pointer-events-none fixed inset-0 z-[3] overflow-hidden">
        <ParallaxLayer at={0} speed={5} className={`inset-x-0 bottom-[4.5vh] text-center text-[clamp(11px,1vw,14px)] tracking-[.4em] ${MONO}`}>
          SCROLL
          <span className="mt-[.9em] block animate-bounce text-[1.6em]">↓</span>
        </ParallaxLayer>
        <ParallaxLayer at={1} speed={2.6} className="bottom-[7vh] left-[6vw] text-[clamp(22px,3.2vw,50px)] font-black tracking-[.02em]">
          {ending}
          <small className={`mt-[.9em] block text-[clamp(10px,.95vw,13px)] tracking-[.4em] ${MONO}`}>{endingNote}</small>
        </ParallaxLayer>
      </div>

      <div className="fixed right-[14px] top-[20vh] z-[4] h-[60vh] w-[2px] bg-black/20">
        <i data-bar className="block h-full w-full origin-top scale-y-0 bg-[#0b0b0b]" />
      </div>

      {webglFailed && (
        <p className="fixed inset-x-0 bottom-[12vh] z-[5] text-center font-bold">WebGL couldn't start in this browser, so the 3D rover can't be shown.</p>
      )}
    </div>
  )
}
