import Image from 'next/image';

export function BrandIcon() {
  return (
    <Image
      src="/brand/feather.png"
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      className="h-6 w-6 shrink-0"
    />
  );
}
