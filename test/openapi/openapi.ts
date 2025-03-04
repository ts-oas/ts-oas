import { ApiMapper } from "../../src";
import { Book, STATUS } from "../common-interfaces";

// <------------------------------------------------------------>
type ResponseUnsuccessData = {
    msg: "This is unsuccess.";
};
type Response<T> = {
    success: boolean;
    data: T;
};
type DefaultResp = {
    /**
     * Bad request
     */
    "400": Response<ResponseUnsuccessData>;
} & {
    /**
     * Oh! Internal Error!
     */
    "500": Response<{
        msg: "This is unsuccess.";
    }>;
};
// <------------------------------------------------------------>

interface GetAllBooksQuery {
    /**
     * @thisIsCustom value
     */
    "query-status"?: (keyof typeof STATUS)[];
}
type GetAllBooksQueryRes = Book[];

/**
 * Sample description.
 * @summary List all Books
 * @operationId getBooks
 * @thisIsCustom
 * @tags category, books
 * @body.contentType multipart/form-data
 * @body.description Description for body !
 */
type GetAllBooksApi = ApiMapper<{
    path: "/category/book";
    method: "GET";
    query: GetAllBooksQuery;
    responses: { "200": Response<GetAllBooksQueryRes> } & DefaultResp;
}>;
type GetAllUnsecureBooksApi = GetAllBooksApi & { security: [] };

interface EditBookQuery extends GetAllBooksQuery {
    another_field: string;
}
interface EditBookRes extends Book {}

type EditBookApi = {
    path: "/category/book/:id";
    method: "PATCH";
    param: { id: number };
    query: EditBookQuery;
    body: {};
    responses: {
        "200": Response<EditBookRes>;
        /**
         * No Content
         */
        "204": never;
    };
};

/**
 * @operationId Edit Book Secure Api
 */
type EditBookSecureApi = ApiMapper<{
    path: "/category/book/:id";
    method: "PATCH";
    param: { id: number };
    query: EditBookQuery;
    body: {};
    responses: {
        "200": Response<EditBookRes>;
        /**
         * No Content
         */
        "204": never;
    };
    security: [{ basicAuth: [] }, { bearerToken: ["book:write", "book:read"] }];
}>;

/**
 * @operationId EditBookApi
 */
type EditBookApiWithMapper = ApiMapper<EditBookApi>;

type EditBookApiWithCustomProperties = {
    path: "/category/book-with-custom-properties/:id";
    method: "PATCH";
    param: { id: number };
    query: EditBookQuery;
    body: {};
    responses: {
        "200": Response<EditBookRes>;
        /**
         * No Content
         */
        "204": never;
    };
    "x-amazon-apigateway-integration": {
        type: "aws_proxy";
        uri: "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:012345678901:function:HelloWorld/invocations";
        responses: {
            "200": {
                statusCode: "200";
                responseParameters: {
                    "method.response.header.requestId": "integration.response.header.cid";
                };
            };
        };
    };
    "x-rate-limit": {
        rate: 100;
        burst: 200;
        timeWindow: "1m";
    };
};
