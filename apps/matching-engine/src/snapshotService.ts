import redisclient  from "@repo/redisclient";

export class SnapshotService {
    static async save(pair : string, data : any) {
        await redisclient.set(`snapshot:${pair}`, JSON.stringify(data));

    }

    static async load(pair : string) {
        const data = await redisclient.get(`snapshot:${pair}`);
        return data ? JSON.parse(data) : null;
    }

}