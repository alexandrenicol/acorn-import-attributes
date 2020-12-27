import { tokTypes as tt, TokenType } from "acorn";

const keyword = "assert";

export function importAssertions(Parser) {
  return class extends Parser {
    constructor(...args) {
      super(...args);
      this.assertToken = new TokenType(keyword);
    }

    _codeAt(i) {
      return this.input.charCodeAt(i);
    }

    _eat(t) {
      // FIXME: are yarn link working with peerDependencies?
      // if (this.type !== t) {
      if (this.type.label !== t.label) {
        this.unexpected();
      }
      this.next()
    }

    readToken(code) {
      for (let i = 0; i < keyword.length; i++) {
        if (this._codeAt(this.pos + i) !== keyword.charCodeAt(i)) {
          return super.readToken(code);
        }
      }

      this.pos += keyword.length;
      return this.finishToken(this.assertToken);
    }

    parseImport(node) {
      this.next();
      // import '...'
      if (this.type === tt.string) {
        node.specifiers = [];
        node.source = this.parseExprAtom();
      } else {
        node.specifiers = this.parseImportSpecifiers();
        this.expectContextual("from");
        node.source =
          this.type.label === tt.string.label ? this.parseExprAtom() : this.unexpected();
          // this.type === tt.string ? this.parseExprAtom() : this.unexpected();
          // FIXME: are yarn link working with peerDependencies?
      }

      if (this.type === this.assertToken) {
        this.next();
        const assertions = this.parseImportAssertions();
        if (assertions) {
          node.assertions = assertions;
        }
      }
      this.semicolon();
      return this.finishNode(node, "ImportDeclaration");
    }

    parseImportAssertions() {
      this._eat(tt.braceL);
      const attrs = this.parseAssertEntries();
      this._eat(tt.braceR);
      return attrs;
    }

    parseAssertEntries() {
      const attrs = [];
      const attrNames = new Set();

      do {
        if (this.type === tt.braceR) {
          break;
        }

        const node = this.startNode();

        // parse AssertionKey : IdentifierName, StringLiteral
        let assertionKeyNode;
        if (this.type === tt.string) {
          assertionKeyNode = this.parseLiteral(this.value);
        } else {
          assertionKeyNode = this.parseIdent(true);
        }
        this.next();
        node.key = assertionKeyNode;

        // for now we are only allowing `type` as the only allowed module attribute
        if (node.key.name !== "type") {
          this.raise(this.pos, "The only accepted import assertion is `type`")
        }
        // check if we already have an entry for an attribute
        // if a duplicate entry is found, throw an error
        // for now this logic will come into play only when someone declares `type` twice
        if (attrNames.has(node.key.name)) {
          this.raise(this.pos, "Duplicated key in assertions")
        }
        attrNames.add(node.key.name);

        // FIXME: are yarn link working with peerDependencies?
        // if (this.type !== tt.string) {
        if (this.type.label !== tt.string.label) {
          this.raise(this.pos, "Only string is supported as an assertion value")
        }

        node.value = this.parseLiteral(this.value);

        attrs.push(this.finishNode(node, "ImportAttribute"));
      } while (this.eat(tt.comma));

      return attrs;
    }
  };
}
