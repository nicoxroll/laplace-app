// components/custom-node.tsx
import { Bot } from "lucide-react";
import { memo } from "react";
import { Handle, Position } from "reactflow";

interface CustomNodeProps {
  data: {
    label: string;
    description: string;
    apiUrl: string;
  };
  isConnectable: boolean;
}

const CustomNode = memo(({ data, isConnectable }: CustomNodeProps) => {
  return (
    <div className="bg-[#161b22] rounded-lg p-2 border-2 border-blue-400 shadow-sm w-36 cursor-pointer hover:border-blue-300 transition-colors">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-blue-400"
      />
      <div className="flex items-center gap-1 mb-1">
        <Bot className="h-3 w-3 text-blue-400" />
        <h3 className="font-semibold text-blue-400 text-xs truncate">
          {data.label}
        </h3>
      </div>
      <p className="text-gray-300 text-[0.6rem] mb-1 truncate">
        {data.description}
      </p>
      <a
        href={data.apiUrl}
        className="text-blue-500 hover:text-blue-400 text-[0.5rem] block truncate"
        target="_blank"
        rel="noopener noreferrer"
      >
        {data.apiUrl}
      </a>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bg-blue-400"
      />
    </div>
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;
