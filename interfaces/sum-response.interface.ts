import {IResponse} from "./response.interface";

export interface ISumResponse extends IResponse{
    ok: true;
    sum: number;
}
