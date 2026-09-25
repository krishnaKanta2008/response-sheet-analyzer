import Analyzer from "@/components/Analyzer";
import { ResultProvider } from "@/lib/result-context";

export default function Home() {
  return (
    <ResultProvider>
      <Analyzer />
    </ResultProvider>
  );
}
