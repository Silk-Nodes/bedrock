import { AddressInspectorOnSubpages } from "@/components/flows/AddressInspectorOnSubpages";
import { ExchangeFilterBar } from "@/components/exchanges/ExchangeFilterBar";

export default function ExchangesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AddressInspectorOnSubpages rootPath="/exchanges" />
      <div className="page" style={{ paddingTop: 16 }}>
        <ExchangeFilterBar />
      </div>
      {children}
    </>
  );
}
