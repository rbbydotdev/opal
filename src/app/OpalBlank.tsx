import clsx from "clsx";

export const OpalBlank = ({ className, size = 28 }: { className?: string; size?: number }) => (
  <div
    className={clsx("rounded-full overflow-hidden", className)}
    style={{
      width: size,
      height: size,
    }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: "#0E1729" }}
      stroke="none"
    >
      <g>
        <circle cx="3.5" cy="3.5" r="2.905" fill="#334055" opacity="0.93"></circle>
        <circle cx="10.5" cy="3.5" r="2.87" fill="#334055" opacity="0.72"></circle>
        <rect
          x="14.49"
          y="0.49"
          width="6.02"
          height="6.02"
          fill="#334055"
          opacity="0.66"
          transform="rotate(66, 17.5, 3.5)"
        ></rect>
        <circle cx="24.5" cy="3.5" r="3.15" fill="#334055" opacity="0.8"></circle>
        <polygon
          points="0.63,12.74 3.5,7.63 5.74,12.74"
          fill="#334055"
          opacity="0.72"
          transform="rotate(122, 3.5, 10.5)"
        ></polygon>
        <circle cx="10.5" cy="10.5" r="3.185" fill="#334055" opacity="0.81"></circle>
        <circle cx="17.5" cy="10.5" r="2.835" fill="#334055" opacity="0.81"></circle>
        <polygon
          points="21.455,13.09 24.5,7.455 27.09,13.09"
          fill="#334055"
          opacity="0.97"
          transform="rotate(47, 24.5, 10.5)"
        ></polygon>
        <circle cx="3.5" cy="17.5" r="2.975" fill="#334055" opacity="0.85"></circle>
        <polygon
          points="7.175,20.65 10.5,14.175 13.65,20.65"
          fill="#334055"
          opacity="0.95"
          transform="rotate(95, 10.5, 17.5)"
        ></polygon>
        <rect
          x="14.21"
          y="14.21"
          width="6.58"
          height="6.58"
          fill="#334055"
          opacity="0.54"
          transform="rotate(54, 17.5, 17.5)"
        ></rect>
        <circle cx="24.5" cy="17.5" r="2.905" fill="#334055" opacity="0.53"></circle>
        <rect
          x="0.56"
          y="21.56"
          width="5.88"
          height="5.88"
          fill="#334055"
          opacity="0.74"
          transform="rotate(24, 3.5, 24.5)"
        ></rect>
        <circle cx="10.5" cy="24.5" r="2.87" fill="#334055" opacity="0.52"></circle>
        <circle cx="17.5" cy="24.5" r="3.395" fill="#334055" opacity="0.97"></circle>
        <rect
          x="21.665"
          y="21.665"
          width="5.67"
          height="5.67"
          fill="#334055"
          opacity="0.71"
          transform="rotate(21, 24.5, 24.5)"
        ></rect>
      </g>
    </svg>
  </div>
);
