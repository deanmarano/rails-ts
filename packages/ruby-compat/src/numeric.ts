/**
 * Ruby `Float#round` (`vendor/ruby/numeric.c:2505` `flo_round`): rounds to
 * `ndigits` decimal places, half away from zero — which is where JS
 * `Math.round` differs, rounding `-0.5` up to `-0` where Ruby answers `-1`.
 * @noRailsEquivalent PERMANENT — Ruby core `Float#round` (`vendor/ruby/numeric.c:2505`).
 */
export function round(x: number, ndigits = 0): number {
  const f = 10 ** ndigits;
  const scaled = x * f;
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
  return ndigits === 0 ? rounded : rounded / f;
}

/**
 * Ruby `Integer#anybits?` (`vendor/ruby/numeric.c:3647` `int_anybits_p`):
 * whether any of `mask`'s set bits are set in `self`.
 *
 * Taken over BigInt rather than JS `&`, which truncates both operands to signed
 * 32 bits: `rb_int_and` is arbitrary-precision, so `(2**40).anybits?(2**40)` is
 * true in Ruby and false under `&`. BigInt's bitwise operators read a value as
 * two's complement of unbounded width, which is the notation
 * `vendor/ruby/spec/ruby/core/integer/anybits_spec.rb:15-20` pins for negative
 * receivers and the bignum cases at `:9-12`.
 *
 * @noRailsEquivalent PERMANENT — Ruby core `Integer#anybits?` (`vendor/ruby/numeric.c:3647`).
 */
export function anybits(x: number | bigint, mask: number | bigint): boolean {
  return (BigInt(x) & BigInt(mask)) !== 0n;
}
