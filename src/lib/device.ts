/**
 * Probes for a WORKING WebGPU before any model load. 'gpu' in navigator is
 * not enough: headless browsers and some Safari/driver combos expose the API
 * but yield no adapter — and a failed first load can poison the runtime's
 * session cache, so the honest probe happens up front.
 */
export async function pickInferenceDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const gpu = (navigator as any)?.gpu;
    if (!gpu) return 'wasm';
    const adapter = await gpu.requestAdapter();
    if (!adapter) return 'wasm';
    const device = await adapter.requestDevice();
    if (!device) return 'wasm';
    device.destroy?.();
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return 'webgpu';
  } catch {
    return 'wasm';
  }
}
