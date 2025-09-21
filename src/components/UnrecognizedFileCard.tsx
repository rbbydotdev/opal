import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, FileQuestion } from "lucide-react";

interface UnrecognizedFileCardProps {
  fileName: string;
  mimeType: string;
}

export function UnrecognizedFileCard({ fileName, mimeType }: UnrecognizedFileCardProps) {
  const handleEditAnyway = () => {
    const url = new URL(window.location.href);
    url.hash = url.hash ? `${url.hash}&editOverride=true` : `#editOverride=true`;
    window.location.href = url.toString();
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileQuestion className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Unrecognized File Type</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="font-medium">{fileName}</p>
          <p className="text-sm text-muted-foreground">
            This file type ({mimeType}) is not supported for editing in the web editor.
          </p>
          <Button onClick={handleEditAnyway} variant="outline" className="w-full">
            <Edit className="h-4 w-4 mr-2" />
            Edit Anyway
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}