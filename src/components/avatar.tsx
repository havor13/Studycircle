import { avatarSrc, initialsOf } from "@/lib/avatar";

type Props = {
  userId: string;
  name: string;
  image?: string | null;
  size?: number;
};

/** A round profile picture, or the person's initials if they have not uploaded one. */
export function Avatar({ userId, name, image, size = 28 }: Props) {
  const box = { width: size, height: size };
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarSrc(userId, image)}
        alt=""
        width={size}
        height={size}
        style={box}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.max(10, Math.round(size * 0.4)) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand/15 font-bold text-brand"
    >
      {initialsOf(name)}
    </span>
  );
}
