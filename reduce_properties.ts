// API doc reference:
// https://www.figma.com/developers/api#files

//styled properties of the each node type will be listed in this array
const nodeProperties = [
  "name",
  "type",
  "background",
  "backgroundColor",
  "opacity",
  "type",
  "fills",
  "text",
  "stroke",
  // "strokes",
  "strokeWeight",
  // "styles",
  "effects",
  // "componentId",
  // "componentProperties",
  "itemSpacing",
  "characters",
  "style",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom"
];
const styleProperties = [
  // 'fontFamily',
  'fontWeight',
  'fontSize',
  // 'textAlignHorizontal',
  // 'textAlignVertical',
  // 'lineHeightPx'
];


function convertRGBA (value: any) {
  const r = Math.round(value.r * 255);
  const g = Math.round(value.g * 255);
  const b = Math.round(value.b * 255);
  const a = value.a;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
// const props: any = {};
// Function to filter properties based on style-related properties
function filterStyleProperties(style: any) {
  for (const _stl in style) {
    // props[_stl] = _stl;
    if (!styleProperties.includes(_stl)) {
      delete style[_stl];
    }
  }
}
function filterNodeProperties(node: any, level: Number | undefined) {
  for (const property in node) {
    // props[property] = property;
    // if (level === 2) {
    //   console.log(node);
    // }
    if (property !== 'children') {
      if (!nodeProperties.includes(property)) {
        delete node[property];
      } else {
        if (node[property] === null || node[property] === undefined) {
          delete node[property];
        } else {
          if (node[property] instanceof Array) {
            if (node[property].length === 0) {
              delete node[property];
            } else {
              // console.log(property, node[property]);
              node[property].forEach((subProp: any) => {
                filterNodeProperties(subProp, 2);
              //   for (const subPropName in subProp) {
              //     if (subProp[subPropName] instanceof Object) {
              //       filterNodeProperties(subProp[subPropName]);
              //     }
              //     // if (subPropName.match(/color/gi)) {
              //     //   subProp[subPropName] = convertRGBA(subProp[subPropName]);
              //     // }
              //   }
              });
            }
          }
          if (property.match(/color/gi)) {
            node[property] = convertRGBA(node[property]);
          }
          if (property === 'style') {
            filterStyleProperties(node[property]);
            // console.log('style', node[property]);
            // for (const stl in node[property]) {
            //   console.log(stl, node[property][stl]);
            //   filterStyleProperties();
            // }
          }
        }
      }
    }
  }
}

// Parse nodes recursively
function parseNodes(nodes: any[]) {
  nodes.forEach(node => {
    // Check if the node type is "CANVAS" and change it to "PAGES"
    if (node.type === "CANVAS") {
      node.type = "PAGES";
    }
    if (node.type === "INSTANCE") {
      node.type = "COMPONENT";
    }

    // Filter properties based on style-related properties
    filterNodeProperties(node, 1);
    // console.log(props);
    // console.log(node);
    // Print node information
    // console.log(`Node ID: ${node.id}`);
    // console.log(`Node Name: ${node.name}`);
    // console.log(`Node Type: ${node.type}`);
    // console.log(node);

    // Recursively parse child nodes if any
    if (node.children) {
      parseNodes(node.children);
    }
  });
}

function parse(value: any) {
  parseNodes(value instanceof Array? value : [value]);
  // console.log(props);
  // console.log(JSON.stringify(value));
}

export default parse;