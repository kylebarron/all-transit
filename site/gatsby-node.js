const path = require('path');
const slash = require('slash');
const {kebabCase, uniq, get, compact, times} = require('lodash');

// Don't forget to update hard code values into:
// - `templates/blog-page.tsx:23`
// - `pages/blog.tsx:26`
// - `pages/blog.tsx:121`
const POSTS_PER_PAGE = 10;
const cleanArray = arr => compact(uniq(arr));

// Create slugs for files.
// Slug will used for blog page path.
exports.onCreateNode = ({node, actions, getNode}) => {
  const {createNodeField} = actions;
  let slug;
  if (node.internal.type === 'MarkdownRemark') {
    const fileNode = getNode(node.parent);
    const [basePath, name] = fileNode.relativePath.split('/');
    slug = `/${basePath}/${name}/`;
  }

  if (slug) {
    // eslint-disable-next-line quotes
    createNodeField({node, name: `slug`, value: slug});
  }
};
