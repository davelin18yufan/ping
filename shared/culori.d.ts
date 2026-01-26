declare module "culori" {
    export interface Color {
        mode: string
        l?: number
        c?: number
        h?: number
        r?: number
        g?: number
        b?: number
        alpha?: number
    }

    export function oklch(color: string): Color | undefined
    export function formatRgb(color: Color): string
}
