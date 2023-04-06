export type Error = {
  name: string;
  message: string;
  code?: string;
  detail?: string;
};

export type JwtPayload = {
  id?: number;
  email: string;
};
