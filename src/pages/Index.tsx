import { RoverParallax } from "../components/rover/RoverParallax"

export const metadata = {
  title: "SV-54 — 3D Lunar Rover Scroll Story",
  description: "A small survey rover built from three.js primitives and procedural textures. Scroll to drive it across the Moon, turn a full circle around it, push in on its camera eye — and watch it blink.",
}

export default function Index() {
  return <RoverParallax />
}
