import { WS_URL } from "@/lib/config";
import { useEffect, useState } from "react"


const useSocket = (ticker : string) => {
    const [socket, setSocket] = useState<null | WebSocket>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);


    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?ticker=${ticker}`)

        setIsConnected(false);

        ws.onopen = () => {
            console.log('client connected');
            setSocket(ws);
            setIsConnected(true);
        }

        ws.onerror = () => {
            setSocket(null);
            setIsConnected(false);
        }

        return () => {
            console.log('client disconnected');
            setIsConnected(false)
            setSocket(null);
        }

    },[ticker])


    return {
        socket,
        isConnected
    }

}

export default useSocket;