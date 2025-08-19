import TradesPageComponet from "@/components/TradesPageComponent";


export default async function MarketPage({params} : {params : Promise<{ticker : string}>}) {
    const ticker = (await params).ticker;

    return <TradesPageComponet ticker={ticker} />


}