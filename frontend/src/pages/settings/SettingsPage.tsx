import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate()
  
  return (
    <div className="flex flex-col justify-center items-center px-4 items-stretch">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Add, remove or edit the categories...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/categories")}
            >
              Edit Categories...
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}