import { z } from "zod";
import { createContract, createMiddleware, createRouter } from "@restype/core";
import { createClient } from "@restype/client";
import { createExpressMiddleware } from "@restype/express";
import type { Express, Request, Response, RequestHandler } from "express";

const contract = createContract({
  test: {
    getTest: {
      method: "GET",
      path: "/test/:tid",
      responses: {
        200: z.string(),
      },
    },
  },
  getPosts: {
    method: "GET",
    path: "/posts/",
    responses: {
      201: z.object({
        postName: z.string(),
      }),
      400: z.string(),
      404: z.object({
        test: z.number(),
      }),
    },
    query: z.object({
      limit: z.string().transform(Number),
    }),
    headers: z.object({
      "x-limit": z.string().transform(Number),
    }),
  },
  getTodo: {
    method: "GET",
    path: "/task/:id",
    responses: {
      200: z.object({
        title: z.string(),
      }),
      400: z.string(),
    },
  },
  createTodo: {
    method: "POST",
    path: "/task/",
    body: z.object({ n: z.number() }),
    responses: {
      204: z.string(),
    },
  },
  createTodoInProject: {
    method: "POST",
    path: "/project/:projectId/task/:tid/",
    body: z.object({ taskName: z.string() }),
    responses: {
      201: z.string(),
    },
  },
});

const createContext = async (req: Request) => {
  let session;

  if ("session" in req) {
    const user = req.session as any;
    session = { userId: user.id as string };
  }

  return { session };
};

const auth: RequestHandler = async (req, res, next) => {
  // const jwt = req.headers["authorization"]?.split("Bearer ")[1];
  // const data = verifyJwt(jwt);

  // if (!hasAuth) {
  //   return res.status(403).json({ message: "Auth required" });
  // }

  // req.session = data;

  next();
};

const { middleware } = createMiddleware(contract, {
  getPosts: [auth],
  test: {
    getTest: [auth],
  },
});

const router = createRouter(contract, createContext, {
  test: {
    getTest: async ({ params }) => {
      return {
        status: 200 as const,
        body: "test ok",
      };
    },
  },
  getPosts: async ({ headers, query }) => {
    if (headers["x-limit"] === 0 || query.limit === 0) {
      return { status: 400 as const, body: "x-limit" };
    }

    return { status: 201 as const, body: { postName: "xxx" } };
  },
  getTodo: async ({ params, ctx }) => {
    console.log(params.id);
    console.log(ctx.session?.userId);

    return {
      status: 200 as const,
      body: {
        title: "title",
      },
    };
  },
  createTodo: async ({ body: { n }, ctx }) => {
    console.log(n);
    console.log(ctx.session?.userId);

    return {
      status: 204 as const,
      body: "asdf",
    };
  },
  createTodoInProject: async ({ params, body }) => {
    return { status: 201 as const, body: "asdf" };
  },
});

const client = createClient(contract, {
  baseUrl: "http://localhost:300/",
  baseHeaders: {
    Authorization: "Bearer TOKEN",
    "X-API-Version": "2022-11-01",
  },
});

const a = client.test.getTest.useQuery({
  params: { tid: "123" },
});

const posts = client.getPosts.useQuery({
  query: { limit: 10 },
  headers: { "x-limit": 10 },
});

if (posts.isError) {
  posts.error.status;
  if (posts.error.status === 404) {
    posts.error.body.test;
  }
} else if (posts.isSuccess) {
  posts.data.postName;
}

const { data: todo } = client.getTodo.useQuery({
  params: { id: "1" },
  refetchInterval: 100,
});
todo?.title;

const {} = client.getTodo.useQuery({
  params: { id: "1" },
});

const mutation = client.createTodo.useMutation({ onSuccess: () => {} });
mutation.mutate({ body: { n: 123 } });

const m = client.createTodoInProject.useMutation({});
m.mutate({
  body: { taskName: "asd" },
  params: { projectId: "pid", tid: "tttiiid" },
});

createExpressMiddleware({} as Express, router, middleware);
