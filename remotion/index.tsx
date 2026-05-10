import { Composition, registerRoot } from "remotion";
import {
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
};

registerRoot(() => (
  <>
    <Composition
      id="StockRatingVideo"
      component={StockRatingVideo}
      fps={30}
      durationInFrames={1020} /* MAIN (900 frames) + 2s branding @ fps 30 on each end */
      width={1080}
      height={1920}
      defaultProps={defaultProps}
    />
  </>
));
