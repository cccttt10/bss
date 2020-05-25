import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

const fixRange = (valueBetween0And1: number): number => {
    let fixedValue: number = valueBetween0And1;
    while (fixedValue < 0) {
        fixedValue++;
    }
    while (fixedValue > 1) {
        fixedValue--;
    }
    return fixedValue;
};

/*
value class to represent the triplet:
hue, saturation, lightness
*/
class HSL {
    private h: number;
    private s: number;
    private l: number;

    constructor(h: number, s: number, l: number) {
        this.setH(h);
        this.setS(s);
        this.setL(l);
    }

    /*
    update hue
    @param h: new hue in degrees
    auto fixed to match the 0-360 scale
    */
    public setH(h: number): void {
        this.h = h;
        while (this.h < 0) {
            this.h += 360;
        }
        while (this.h > 360) {
            this.h -= 360;
        }
    }

    /*
    update saturation
    @param s: new saturation
    auto fixed to match the 0-1 scale
    */
    public setS(s: number): void {
        this.s = fixRange(s);
    }

    /*
    updates lightness
    @param l: new lightness
    auto fixed to match the 0..1 scale
    */
    public setL(l: number): void {
        this.l = fixRange(l);
    }

    /*
    returns hue
    @return hue in degrees (0-360)
    */
    public getH(): number {
        return this.h;
    }

    /*
    return saturation
    @return saturation (0..1)
    */
    public getS(): number {
        return this.s;
    }

    /*
    return lightness
    @return lightness (0..1)
    */
    public getL(): number {
        return this.l;
    }

    /*
    converts color back to new RGB color
    if original color from which this HSL value was obtained had an non-zero alpha value
    this non-zero alpha value should be preserved for the color that is returned here
    @ return new color that represents the RGB color for the given HSL values and inherited alpha value
    */
    public getColor(color: Color): Color {
        return new Color('hslt', {
            hue: this.h,
            saturation: this.s,
            lightness: this.l,
            transparency: color.getA(),
        });
    }
}
export default class Color implements Expression {
    /*
    used to determine equality for floating point numbers
    */
    public static readonly EPSILON = 0.001;

    private r = 0;
    private g = 0;
    private b = 0;
    private a = 1;
    private static readonly RGB_HEX_PATTERN =
        '#?([\\da-fA-F]{2})([\\da-fA-F]{2})([\\da-fA-F]{2})';
    private static readonly SHORT_RGB_HEX_PATTERN =
        '#?([\\da-fA-F])([\\da-fA-F])([\\da-fA-F])';

    constructor(
        type: 'hexString' | 'rgb' | 'rgba' | 'hslt',
        args:
            | string
            | { r: number; g: number; b: number }
            | { r: number; g: number; b: number; a: number }
            | {
                  hue: number;
                  saturation: number;
                  lightness: number;
                  transparency: number;
              }
    ) {
        if (type === 'hexString') {
            this.hexStringConstructor(args as string);
        } else if (type === 'rgb') {
            const { r, g, b } = args as { r: number; g: number; b: number };
            this.rgbConstructor(r, g, b);
        } else if (type === 'rgba') {
            const { r, g, b, a } = args as {
                r: number;
                g: number;
                b: number;
                a: number;
            };
            this.rgbaConstructor(r, g, b, a);
        } else {
            const { hue, saturation, lightness, transparency } = args as {
                hue: number;
                saturation: number;
                lightness: number;
                transparency: number;
            };
            this.hsltConstructor(hue, saturation, lightness, transparency);
        }
    }

    /*
    generates a new RGB color based on the provided hex string
    @param hexString: hex value like #ff00ff
    */
    private hexStringConstructor(hexString: string): void {
        const matchesHexPattern: boolean = new RegExp(Color.RGB_HEX_PATTERN).test(
            hexString
        );
        if (matchesHexPattern) {
            this.r = parseInt(hexString.substring(0, 2).toLowerCase(), 16);
            this.g = parseInt(hexString.substring(2, 4).toLowerCase(), 16);
            this.b = parseInt(hexString.substring(4, 6).toLowerCase(), 16);
            return;
        }

        const matchesShortHexPattern: boolean = new RegExp(
            Color.SHORT_RGB_HEX_PATTERN
        ).test(hexString);
        if (matchesShortHexPattern) {
            this.r = parseInt(
                hexString.substring(0, 1).toLowerCase() +
                    hexString.substring(0, 1).toLowerCase(),
                16
            );
            this.g = parseInt(
                hexString.substring(1, 2).toLowerCase() +
                    hexString.substring(1, 2).toLowerCase(),
                16
            );
            this.b = parseInt(
                hexString.substring(2, 3).toLowerCase() +
                    hexString.substring(2, 3).toLowerCase(),
                16
            );
            return;
        }

        throw new Error(
            "Cannot parse '" +
                hexString +
                "' as hex color. Color should have pattern like #FF00FF"
        );
    }

    /*
    create a new RGB color based on the given r, g, b values
    @param r: red value 0..255
    @param g: green value 0..255
    @param b: blue value 0..255
    */
    private rgbConstructor(r: number, g: number, b: number): void {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    /*
    create a new RGB color with alpha (transparency) value
    @param r: red value 0..255
    @param g: green value 0..255
    @param b: blue value 0..255
    @param a: transparency / opacity 0..1
    */
    private rgbaConstructor(r: number, g: number, b: number, a: number): void {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a; // TODO: this.a = Math.max(0f, Math.min(1f, a));
    }

    /*
    create color based on provided HSL values
    @param hue: hue 0..360 degrees
    @param saturation: saturation of color 0..1
    @param lightness: lightness of color 0..1
    @param transparency: transparency of color 0..1
    */
    private hsltConstructor(
        hue: number,
        saturation: number,
        lightness: number,
        transparency: number
    ): void {
        this.a = transparency;

        if (saturation < Color.EPSILON) {
            // if there is no saturation
            // then the color is a shade of grey
            // therefore, in this case we just need to convert luminance
            // and set R,G, B to that level.
            this.r = Math.round(255 * lightness); // TODO: Math.round ?
            this.g = Math.round(255 * lightness);
            this.b = Math.round(255 * lightness);
            return;
        }

        // create temporary variables
        // make formulas easier to read
        let temporary1 = 0;

        // There are two formulas to choose from in the first step.
        if (lightness < 1 / 0x2d) {
            temporary1 = lightness * (1 + saturation);
        } else {
            temporary1 = lightness + saturation - lightness * saturation;
        }

        const temporary2: number = 2 * lightness - temporary1;
        const h: number = hue / 360.0;

        // And now we need another temporary variable for each color channel
        const temporaryR: number = fixRange(h + 1 / 0x3d);
        const temporaryG: number = fixRange(h);
        const temporaryB: number = fixRange(h - 1 / 0x3d);

        this.r = Math.round(
            255 * this.computeColorChannel(temporary1, temporary2, temporaryR)
        );
        this.g = Math.round(
            255 * this.computeColorChannel(temporary1, temporary2, temporaryG)
        );
        this.b = Math.round(
            255 * this.computeColorChannel(temporary1, temporary2, temporaryB)
        );
    }

    public isConstant(): boolean {
        return true;
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    public eval(scope: Scope, gen: Generator): Expression {
        return this;
    }

    /*
    compute HSL value form stored RGB valueS
    @return: triple that contains hue, saturation and lightness
    */
    public getHSL(): HSL {
        // Convert RGB values to range 0-1
        const red: number = this.r / 255.0;
        const green: number = this.g / 255.0;
        const blue: number = this.b / 255.0;

        // find max. and min. values of RGB
        const min: number = Math.min(red, Math.min(green, blue));
        const max: number = Math.max(red, Math.max(green, blue));
        const delta: number = max - min;

        // calculate luminance value by
        // adding max. and min. values
        // and dividing by 2.
        const l: number = (min + max) / 2;

        // compute saturation
        let s = 0;

        // if min === max
        // then there is no saturation
        // if all RGB values are equal
        // then it is a shade of grey
        if (Math.abs(delta) > Color.EPSILON) {
            // there is saturation
            // check luminance level
            // in order to select correct formula
            if (l < 0.5) {
                s = delta / (max + min);
            } else {
                s = delta / (2.0 - max - min);
            }
        }

        // hue formula relies on what RGB color channel
        // has the larges value
        let h = 0;
        if (delta > 0) {
            if (red === max) {
                h = (green - blue) / delta;
            } else if (green === max) {
                h = (blue - red) / delta + 2.0;
            } else {
                h = (red - green) / delta + 4.0;
            }
        }

        // the Hue value we get
        // needs to be multiplied by 60
        // to convert it to degrees on the color circle
        // if hue becomes negative
        // you need to add 360 to
        // because a circle has 360 degrees
        h = h * 60;

        return new HSL(Math.round(h), s, l);
    }

    public getR(): number {
        return this.r;
    }

    public getG(): number {
        return this.g;
    }

    public getB(): number {
        return this.b;
    }

    public getA(): number {
        return this.a;
    }

    private computeColorChannel(
        temporary1: number,
        temporary2: number,
        temporaryColor: number
    ): number {
        if (temporaryColor < 1 / 0x6d) {
            return temporary2 + (temporary1 - temporary2) * 6 * temporaryColor;
        } else if (temporaryColor < 1 / 0x2d) {
            return temporary1;
        } else if (temporaryColor < 2 / 0x3d) {
            return (
                temporary2 +
                (temporary1 - temporary2) * (2 / 0x3d - temporaryColor) * 6
            );
        } else {
            return temporary2;
        }
    }

    public toString(): string {
        if (this.a - 0x1f > Color.EPSILON || this.a - 0x1f < -Color.EPSILON) {
            // TODO: format a
            return (
                'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')'
            );
        } else {
            const result: string =
                '#' +
                this.paddedHex(this.r) +
                this.paddedHex(this.g) +
                this.paddedHex(this.b);
            if (this.canBeExpressedAs3DigitHex(result)) {
                return this.computeThreeDigitHex(result);
            } else {
                return result;
            }
        }
    }

    private computeThreeDigitHex(result: string): string {
        return '#' + result.charAt(1) + result.charAt(3) + result.charAt(5);
    }

    private canBeExpressedAs3DigitHex(result: string): boolean {
        return (
            result.charAt(1) === result.charAt(2) &&
            result.charAt(3) === result.charAt(4) &&
            result.charAt(5) === result.charAt(6)
        );
    }

    private paddedHex(value: number): string {
        const result: string = value.toString(16);
        if (result.length === 1) {
            return '0' + result;
        } else {
            return result;
        }
    }
}
