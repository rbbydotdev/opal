import { ClassAttributes, ImgHTMLAttributes, JSX } from "react";

function OpalSvgDark({
  className,
  ...props
}: JSX.IntrinsicAttributes & ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement>) {
  return <img src="/opal-blank.svg" alt="Opal Icon" {...props} className={"opalSvgDark " + (className ?? "")} />;
}

function OpalSvgLight({
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
