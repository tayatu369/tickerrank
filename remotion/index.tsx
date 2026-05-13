import { Composition, registerRoot } from "remotion";
import {
  getTotalCompositionFrames,
  StockRatingVideo,
  type StockRatingVideoProps,
} from "./StockRatingVideo";

const defaultProps: StockRatingVideoProps = {
  stock: "AAPL",
  rating: "A-",
  label: "Bullish",
  score: 85,
  reason1:
    "Strong revenue growth driven by resilient consumer demand across core product lines.",
  reason2:
    "Healthy balance sheet and expanding margins provide a solid cushion for downside scenarios.",
  screenshotUrl:
    "https://placehold.co/1080x1920/0B1120/3B82F6/png?text=Screenshot+preview",
  audioUrl: "",
  templateIndex: 0,
};

registerRoot(() => (
  <>
    <Composition
      id="StockRatingVideo"
      component={StockRatingVideo}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => {
        const fps = 30;
        const ti = Math.min(9, Math.max(0, Math.floor(Number(props.templateIndex) || 0)));
        return {
          durationInFrames: getTotalCompositionFrames(ti, fps),
        };
      }}
    />
  </>
));
