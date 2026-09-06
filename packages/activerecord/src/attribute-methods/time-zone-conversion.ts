import { ValueType } from "@blazetrails/activemodel";
import { ActsLikeObject, TimeWithZone, zone as timeZone } from "@blazetrails/activesupport";
import {
  type DateOrTime,
  inTimeZone,
} from "@blazetrails/activesupport/core-ext/date-and-time/zones";
import { Temporal, Time as RubyTime } from "@blazetrails/date";
import { classAttribute, included } from "@blazetrails/activesupport";
type ValueTypeInstance = InstanceType<typeof ValueType>;

interface TimeValueSubtype extends ValueType {
  userInputInTimeZone(value: unknown): unknown;
}

export interface TimeZoneConversion {
  timeZoneAwareAttributes: boolean;
  skipTimeZoneConversionForAttributes: string[];
  timeZoneAwareTypes: string[];
}

interface TimeZoneConversionIncludeHost {
  name: string;
}

export const TimeZoneConversion = {
  [included](base: TimeZoneConversionIncludeHost): void {
    classAttribute.call(base, "timeZoneAwareAttributes", {
      instanceWriter: false,
      default: false,
    });
    classAttribute.call(base, "skipTimeZoneConversionForAttributes", {
      instanceWriter: false,
      default: [],
    });
    classAttribute.call(base, "timeZoneAwareTypes", {
      instanceWriter: false,
      default: ["datetime", "time"],
    });
  },
};

export class TimeZoneConverter extends ValueType<unknown> {
  private readonly _subtype: ValueType;

  constructor(subtype: ValueType) {
    super();
    this._subtype = subtype;
  }

  static wrap(subtype: ValueType): TimeZoneConverter {
    return subtype instanceof TimeZoneConverter ? subtype : new TimeZoneConverter(subtype);
  }

  override type(): string | undefined {
    return this._subtype.type();
  }

  override cast(value: unknown): unknown {
    if (value == null) return null;
    if (isPlainObject(value)) {
      return setTimeZoneWithoutConversion(this._subtype.cast(value));
    }
    if (value instanceof TimeWithZone || value instanceof RubyTime) {
      const casted = this._subtype.cast(
        (this._subtype as TimeValueSubtype).userInputInTimeZone(value),
      );
      return casted != null && casted !== false ? casted : this._subtype.cast(value);
    }
    if (value instanceof Temporal.ZonedDateTime) {
      return this.convertTimeToTimeZone(value.toInstant());
    }
    if (value instanceof Temporal.Instant) {
      return this.convertTimeToTimeZone(this._subtype.cast(value));
    }
    if (value instanceof Temporal.PlainDateTime) {
      return setTimeZoneWithoutConversion(value.toZonedDateTime("UTC").toInstant());
    }
    if (typeof value === "string") {
      const casted = this._subtype.cast(
        (this._subtype as TimeValueSubtype).userInputInTimeZone(value),
      );
      return casted != null && casted !== false ? casted : this._subtype.cast(value);
    }
    return this.map(this._subtype.cast(value), (v) => this.cast(v));
  }

  override deserialize(value: unknown): unknown {
    return this.convertTimeToTimeZone(this._subtype.deserialize(value));
  }

  override serialize(value: unknown): unknown {
    return this._subtype.serialize(value);
  }

  override serializeCastValue(value: unknown): unknown {
    const sub = this._subtype;
    if (typeof sub.itselfIfSerializeCastValueCompatible === "function") {
      return sub.itselfIfSerializeCastValueCompatible()
        ? sub.serializeCastValue(value as any)
        : this._subtype.serialize(value);
    }
    return this._subtype.serialize(value);
  }

  override assertValidValue(value: unknown): void {
    this._subtype.assertValidValue(value);
  }

  override isValueConstructedByMassAssignment(value: unknown): boolean {
    return this._subtype.isValueConstructedByMassAssignment(value);
  }

  override equals(other: ValueType): boolean {
    if (!(other instanceof TimeZoneConverter)) return false;
    const sub = this._subtype;
    return typeof sub.equals === "function"
      ? sub.equals(other._subtype)
      : this._subtype === other._subtype;
  }

  override map(value: unknown, block: (value: unknown) => unknown): unknown {
    return this._subtype.map(value as never, block);
  }

  private convertTimeToTimeZone(value: unknown): unknown {
    if (value == null) return null;

    if (ActsLikeObject.actsLike(value, "time")) {
      return inTimeZone(value as DateOrTime);
    } else if (isInfinite(value)) {
      return value;
    } else {
      return this.map(value, (v) => this.convertTimeToTimeZone(v));
    }
  }
}

/** @internal */
function isInfinite(value: unknown): boolean {
  const fn = (value as { isInfinite?: unknown }).isInfinite;
  if (typeof fn === "function") {
    const result = (fn as () => unknown).call(value);
    return result != null && result !== false;
  }
  return value === Infinity || value === -Infinity;
}

/** @internal */
function setTimeZoneWithoutConversion(value: unknown): unknown {
  if (value == null || value === false) return null;
  const utc = timeZone()!.localToUtc(value as RubyTime);
  return utc == null ? null : inTimeZone(utc as DateOrTime);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

interface TimeZoneConversionHost {
  timeZoneAwareAttributes: boolean;
  skipTimeZoneConversionForAttributes: string[];
  timeZoneAwareTypes: string[];
  /** @internal */
  _hookAttributeType?(name: string, castType: unknown): unknown;
}

/** @internal */
export function hookAttributeType(
  this: TimeZoneConversionHost,
  name: string,
  castType: ValueType,
): ValueType {
  if (isCreateTimeZoneConversionAttribute.call(this, name, castType)) {
    return TimeZoneConverter.wrap(castType);
  }
  return castType;
}

/** @internal */
function isCreateTimeZoneConversionAttribute(
  this: TimeZoneConversionHost,
  name: string,
  castType: ValueType,
): boolean {
  const enabledForColumn =
    this.timeZoneAwareAttributes && !this.skipTimeZoneConversionForAttributes.includes(name as any);
  return (
    enabledForColumn &&
    (this.timeZoneAwareTypes ?? ["datetime", "time"]).includes(castType.type() ?? "")
  );
}
