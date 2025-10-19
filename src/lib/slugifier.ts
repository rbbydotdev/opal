import slugify from "slugify";

export function slugifier(name: string) {
  return slugify(name, { strict: true });
}
