/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
  extends: ['eslint:recommended', 'google', 'plugin:jsdoc/recommended'],
  env: {
    node: true, // Things like require()
    es6: true,  // Things like Promise
  },
  parserOptions: {
    ecmaVersion: 2019,  // Arrow functions, generators, etc.
  },
  settings: {
    jsdoc: {
      // Closure is not used here, but Closure conventions for things like
      // "@private {string}" are used in this project.
      mode: 'closure',

      // Google style enforces @return over @returns via valid-jsdoc.  The
      // recommended settings in the jsdoc plugin conflict, so we tweak them to
      // match.
      tagNamePreference: {
        returns: 'return',
      },
    },
  },
  rules: {
    // Project-specific rules go here.

    // The Google recommendations use the deprecated "require-jsdoc", which is
    // superceded by the more flexible and configurable jsdoc plugin.
    'require-jsdoc': 'off',

    // Allow multiple spaces before a comment at the end of the line.
    // Sometimes useful for alignment.
    'no-multi-spaces': ['error', {ignoreEOLComments: true}],

    'jsdoc/require-jsdoc': ['error', {
      // Require jsdoc on non-exported things, too.
      publicOnly: false,

      // Where to require jsdoc:
      require: {
        ArrowFunctionExpression: false,
        ClassDeclaration: true,
        ClassExpression: true,
        FunctionDeclaration: true,
        FunctionExpression: false,
        MethodDefinition: true,
      },

      // Because we documented the class declaration, constructors only need
      // docs for their parameters.  Therefor those that take no arguments are
      // exempt from the general requirement to document methods.
      exemptEmptyConstructors: true,
    }],

    'jsdoc/require-description': ['error', {
      // Constructors don't need a description in addition to the class-level
      // description.  Only constructor parameters must be documented.
      checkConstructors: false,

      // The @description and @desc tags are implied and should not be used.
      descriptionStyle: 'body',
    }],

    // Google style does not require descriptions of every return value.
    'jsdoc/require-returns-description': 'off',

    'jsdoc/no-undefined-types': ['error', {
      definedTypes: [
        // Unlike a browser environment, NodeJS has a Timeout type that is
        // returned by setTimeout.  https://nodejs.org/api/timers.html
        'Timeout',
        // NodeJS also defines a Console type, of which the global console is an
        // instance.  https://nodejs.org/api/console.html
        'Console',
        // Yargs is our command-line parser module.
        'Yargs',
        // NodeSSH is the type created by the node-ssh module.
        'NodeSSH',
      ],
    }],
  },
};
