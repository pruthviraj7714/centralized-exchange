import { WS_URL } from "@/lib/config";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react"


const useSocket = (ticker : string) => {
    const [socket, setSocket] = useState<null | WebSocket>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const { data } = useSession();

    useEffect(() => {
        if(!data || !data.accessToken) return;
        const ws = new WebSocket(`${WS_URL}?ticker=${ticker}&token=${data.accessToken}`)

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

    },[ticker, data])

    return {
        socket,
        isConnected
    }

}

export default useSocket;