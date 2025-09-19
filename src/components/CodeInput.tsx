import { useState } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, FileCode, Calculator, Braces } from "lucide-react";

interface CodeInputProps {
  onGenerate: (code: string, language: string) => void;
  isGenerating?: boolean;
}

const sampleCode = {
  c: `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}`,
  python: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`,
  java: `public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}`,
  expression: `(3 + 5) * 2 - sqrt(16) / 4`
};

const languageIcons = {
  c: FileCode,
  python: FileCode,
  java: Braces,
  expression: Calculator
};

export const CodeInput = ({ onGenerate, isGenerating = false }: CodeInputProps) => {
  const [code, setCode] = useState(sampleCode.expression);
  const [language, setLanguage] = useState("expression");

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(sampleCode[newLanguage as keyof typeof sampleCode]);
  };

  const handleGenerate = () => {
    if (code.trim()) {
      onGenerate(code, language);
    }
  };

  const Icon = languageIcons[language as keyof typeof languageIcons];

  return (
    <Card className="p-6 bg-gradient-surface shadow-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="language-select" className="text-lg font-semibold flex items-center gap-2">
            <Icon className="w-5 h-5" />
            Input Code or Expression
          </Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-48 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="expression">Mathematical Expression</SelectItem>
              <SelectItem value="c">C Programming</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Textarea
            id="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code or mathematical expression here..."
            className="min-h-32 font-code text-sm bg-card border-border resize-none"
            rows={8}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!code.trim() || isGenerating}
            variant="generate"
            size="lg"
            className="min-w-32"
          >
            <Play className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate AST"}
          </Button>
        </div>
      </div>
    </Card>
  );
};