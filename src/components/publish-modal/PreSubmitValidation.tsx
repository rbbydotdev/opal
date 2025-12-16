import { NetlifyEval } from "@/components/publish-modal/NetlifyDestinationForm";
import { GithubEval } from "@/components/publish-modal/GitHubDestinationForm";
import { ValidationFunction } from "@/components/publish-modal/PublicationModalDestinationContent";
import { DestinationType } from "@/data/DestinationSchemaMap";

// Helper function to create a no-op validation for types that don't need it
export const noValidation =
  <T extends DestinationType>(): ValidationFunction<T> =>
  async (data) =>
    data;
export const PreSubmitValidation: Record<DestinationType, ValidationFunction<any>> = {
  vercel: noValidation<"vercel">(),
  github: GithubEval,
  cloudflare: noValidation<"cloudflare">(),
  netlify: NetlifyEval,
  aws: noValidation<"aws">(),
  custom: noValidation<"custom">(),
};
