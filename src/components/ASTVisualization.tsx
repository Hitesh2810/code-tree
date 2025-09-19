import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { ASTNode } from "@/utils/astParser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Download, ZoomIn, ZoomOut, RotateCcw, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ASTVisualizationProps {
  astData: ASTNode | null;
  isLoading?: boolean;
}

const nodeColors = {
  keyword: 'hsl(var(--ast-keyword))',
  operator: 'hsl(var(--ast-operator))',
  identifier: 'hsl(var(--ast-identifier))',
  constant: 'hsl(var(--ast-constant))'
};

export const ASTVisualization = ({ astData, isLoading = false }: ASTVisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<ASTNode | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!astData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    // Create hierarchy
    const root = d3.hierarchy(astData);
    const treeLayout = d3.tree<ASTNode>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const treeData = treeLayout(root);

    // Add links
    g.selectAll(".link")
      .data(treeData.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<any, any>()
        .x(d => d.x + margin.left)
        .y(d => d.y + margin.top))
      .style("fill", "none")
      .style("stroke", "hsl(var(--border))")
      .style("stroke-width", 2)
      .style("stroke-opacity", 0.6);

    // Add nodes
    const nodes = g.selectAll(".node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x + margin.left},${d.y + margin.top})`)
      .style("cursor", "pointer");

    // Node circles
    nodes.append("circle")
      .attr("r", 8)
      .style("fill", d => nodeColors[d.data.tokenType])
      .style("stroke", "hsl(var(--foreground))")
      .style("stroke-width", 2)
      .style("stroke-opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 12)
          .style("filter", "drop-shadow(0 0 8px currentColor)");
        
        // Show tooltip
        setSelectedNode(d.data);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 8)
          .style("filter", "none");
      })
      .on("click", (event, d) => {
        setSelectedNode(d.data);
      });

    // Node labels
    nodes.append("text")
      .attr("dy", "0.35em")
      .attr("x", d => d.children ? -15 : 15)
      .style("text-anchor", d => d.children ? "end" : "start")
      .style("font-family", "var(--font-code)")
      .style("font-size", "12px")
      .style("fill", "hsl(var(--foreground))")
      .style("font-weight", "500")
      .text(d => d.data.value.length > 15 ? d.data.value.substring(0, 15) + "..." : d.data.value);

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

  }, [astData]);

  const handleExport = async () => {
    if (!containerRef.current) return;

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#1a1f2e',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = 'ast-diagram.png';
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success("AST diagram exported successfully!");
    } catch (error) {
      toast.error("Failed to export diagram");
    }
  };

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.5
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1 / 1.5
    );
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  if (isLoading) {
    return (
      <Card className="p-8 bg-gradient-surface shadow-card">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Generating AST...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!astData) {
    return (
      <Card className="p-8 bg-gradient-surface shadow-card">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Info className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Enter code above to generate AST visualization</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-surface shadow-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Abstract Syntax Tree</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Zoom: {(zoom * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleZoomIn} variant="ghost" size="icon">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button onClick={handleZoomOut} variant="ghost" size="icon">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button onClick={handleReset} variant="ghost" size="icon">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button onClick={handleExport} variant="export" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors.keyword }}></div>
            <span className="text-sm text-muted-foreground">Keywords</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors.operator }}></div>
            <span className="text-sm text-muted-foreground">Operators</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors.identifier }}></div>
            <span className="text-sm text-muted-foreground">Identifiers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors.constant }}></div>
            <span className="text-sm text-muted-foreground">Constants</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="bg-card rounded-lg mx-4 mb-4 overflow-hidden">
        <svg ref={svgRef} className="w-full"></svg>
      </div>

      {selectedNode && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-4">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: nodeColors[selectedNode.tokenType] }}
            ></div>
            <div>
              <p className="font-semibold">{selectedNode.value}</p>
              <p className="text-sm text-muted-foreground">
                Type: {selectedNode.tokenType} • Node: {selectedNode.type}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};