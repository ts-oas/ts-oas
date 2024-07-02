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
    "500": Response<ResponseUnsuccessData>;
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
type GetAllUnsecureBooksApi = GetAllBooksApi & {security: []};

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

type EditBookSecureApi = {
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
};

/**
 * @operationId EditBookApi
 */
type EditBookApiWithMapper = ApiMapper<EditBookApi>;

/**
 * @operationId Edit Book Secure Api
 */
type EditBookSecureApiMapper = ApiMapper<EditBookSecureApi>;
