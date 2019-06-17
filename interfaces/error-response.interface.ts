import {IResponse} from "./response.interface";

export interface IErrorResponse extends IResponse{
    ok: false;

    error: IErrorDetails
}

interface IErrorDetails {
    code: number,
    msg: string;
}
