import { useState } from "react";
import { CodeInput } from "@/components/CodeInput";
import { ASTVisualization } from "@/components/ASTVisualization";
import { parseCode } from "@/utils/astParser";
import { ASTNode } from "@/utils/astParser";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Code, Sparkles } from "lucide-react";

const Index = () => {
  const [astData, setAstData] = useState<ASTNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (code: string, language: string) => {
    setIsGenerating(true);
    
    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const ast = parseCode(code, language);
      setAstData(ast);
      
      toast.success(`AST generated successfully for ${language}!`);
    } catch (error) {
      toast.error("Failed to parse code. Please check your syntax.");
      console.error("Parsing error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Code className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Visual AST Generator</h1>
                <p className="text-sm text-muted-foreground">Transform code into interactive syntax trees</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="hidden sm:flex">
                <Sparkles className="w-3 h-3 mr-1" />
                Interactive Visualization
              </Badge>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Introduction */}
          <Card className="p-6 bg-gradient-surface shadow-card">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Visualize Your Code Structure
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Generate beautiful Abstract Syntax Trees from C, Python, Java code, or mathematical expressions. 
                Perfect for understanding code structure, compiler design, and educational purposes.
              </p>
            </div>
          </Card>

          {/* Input Section */}
          <CodeInput 
            onGenerate={handleGenerate} 
            isGenerating={isGenerating}
          />

          {/* Visualization Section */}
          <ASTVisualization 
            astData={astData} 
            isLoading={isGenerating}
          />

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-surface shadow-card text-center">
              <div className="w-12 h-12 bg-ast-keyword/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Code className="w-6 h-6 text-ast-keyword" />
              </div>
              <h3 className="font-semibold mb-2">Multi-Language Support</h3>
              <p className="text-sm text-muted-foreground">
                Parse C, Python, Java code and mathematical expressions with accurate syntax analysis.
              </p>
            </Card>

            <Card className="p-6 bg-gradient-surface shadow-card text-center">
              <div className="w-12 h-12 bg-ast-operator/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-ast-operator" />
              </div>
              <h3 className="font-semibold mb-2">Interactive Visualization</h3>
              <p className="text-sm text-muted-foreground">
                Hover over nodes for details, zoom and pan for better exploration of complex trees.
              </p>
            </Card>

            <Card className="p-6 bg-gradient-surface shadow-card text-center">
              <div className="w-12 h-12 bg-ast-identifier/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Github className="w-6 h-6 text-ast-identifier" />
              </div>
              <h3 className="font-semibold mb-2">Export & Share</h3>
              <p className="text-sm text-muted-foreground">
                Export your AST diagrams as high-quality PNG images for presentations and documentation.
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Built with React, D3.js, and Tailwind CSS • Open source visualization tool</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;