import { z } from "zod";
import { createContract, createRouter } from "@typesafe-rest/core";
import { createClient } from "@typesafe-rest/client";

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
    path: "/project/:projectId/task/",
    body: z.object({ taskName: z.string() }),
    responses: {
      201: z.string(),
    },
  },
});

const createContext = async () => {
  const session = { userId: 1 };

  return {
    session,
  };
};

const router = createRouter(contract, createContext, {
  test: {
    getTest: async ({ params }) => {
      return {
        status: 200 as const,
        body: "test ok",
      };
    },
  },
  getPosts: async ({ headers }) => {
    if (headers["x-limit"] === 0) {
      return { status: 400 as const, body: "x-limit" };
    }

    return { status: 201 as const, body: { postName: "xxx" } };
  },
  getTodo: async ({
    params: { id },
    ctx: {
      session: { userId },
    },
  }) => {
    console.log(id);
    console.log(userId);

    return {
      status: 200 as const,
      body: {
        title: "title",
      },
    };
  },
  createTodo: async ({
    body: { n },
    ctx: {
      session: { userId },
    },
  }) => {
    console.log(n);
    console.log(userId);

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
mutation.mutate({ n: 123 });
