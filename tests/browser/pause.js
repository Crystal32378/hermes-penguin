// Harness only; native Hermes uses its real pause controller.
export function createRendererLoopPauseController(change){
  const notify=()=>change();document.addEventListener('visibilitychange',notify)
  return {isPaused:()=>document.hidden,dispose:()=>document.removeEventListener('visibilitychange',notify)}
}
