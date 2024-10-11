/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
import config from "@payload-config";
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";

import { importMap } from "../importMap";

import type { Metadata } from "next";

type Args = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export const generateMetadata = ({
  params,
  searchParams,
}: Args): Promise<Metadata> =>
  generatePageMetadata({
    config,
    params,
    searchParams,
  });

const Page = ({ params, searchParams }: Args) =>
  RootPage({
    config,
    params,
    searchParams,
    importMap,
  });

export default Page;
