export function getFractionalPosition(
  previousPosition?: number,
  nextPosition?: number,
) {
  if (typeof previousPosition === "number" && typeof nextPosition === "number") {
    return (previousPosition + nextPosition) / 2;
  }

  if (typeof previousPosition !== "number" && typeof nextPosition === "number") {
    return nextPosition / 2;
  }

  if (typeof previousPosition === "number" && typeof nextPosition !== "number") {
    return previousPosition + 1000;
  }

  return 1000;
}
