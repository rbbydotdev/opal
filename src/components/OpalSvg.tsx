import { ClassAttributes, ImgHTMLAttributes, JSX } from "react";

export function OpalSvgDark({
  className,
  ...props
}: JSX.IntrinsicAttributes & ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement>) {
  return <img src="/opal-blank.svg" alt="Opal Icon" {...props} className={"opalSvgDark " + (className ?? "")} />;
}

export function OpalSvgLight({
  className,
  ...props
}: JSX.IntrinsicAttributes & ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement>) {
  return <img src="/opal.svg" alt="Opal Icon" {...props} className={"opalSvgLight " + (className ?? "")} />;
}

export function OpalSvg(
  props: JSX.IntrinsicAttributes & ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement>
) {
  return (
    <>
      <OpalSvgDark {...props} /> <OpalSvgLight {...props} />
    </>
  );
}
