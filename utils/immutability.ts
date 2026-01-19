/**
 * Deep freezes an object to make it immutable.
 * Used for inspectionJourney to strictly enforce read-only policy.
 * 
 * In strict "Inspection Mode", discovered journeys must never be mutated.
 * This utility ensures runtime enforcement of that rule.
 */
export function deepFreeze<T>(object: T): T {
    // Retrieve the property names defined on object
    const propNames = Object.getOwnPropertyNames(object);

    // Freeze properties before freezing self
    for (const name of propNames) {
        const value = (object as any)[name];

        if (value && typeof value === "object") {
            deepFreeze(value);
        }
    }

    return Object.freeze(object);
}
