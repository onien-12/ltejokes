export function timeToSeconds(timeStr: string) {
  const parts = timeStr.split(":").map(Number);
  let seconds = 0;

  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  } else {
    throw new Error("Invalid time format");
  }

  return seconds;
}

export const formatTime = (time: number): string => {
  if (isNaN(time) || time < 0) return "0:00";
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  const paddedSeconds = seconds < 10 ? "0" + seconds : seconds;
  const paddedMinutes = minutes < 10 && hours > 0 ? "0" + minutes : minutes;
  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    return `${minutes}:${paddedSeconds}`;
  }
};
