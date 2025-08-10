import { IdenticonStr } from "@/components/IndenticonStr";

interface IdenticonProps {
  input: string;
  size?: number; // Grid size
  scale?: number; // Size of each cell in pixels
}
export const Identicon = (props: IdenticonProps) => {
  return <span dangerouslySetInnerHTML={{ __html: IdenticonStr(props) }}></span>;
};
