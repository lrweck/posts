.PHONY: new-post serve build deploy help

# Create a new post
new-post:
	@test -n "$(SLUG)" || (echo "Usage: make new-post SLUG=my-post-title"; exit 1)
	@mkdir -p "content/blog/$(SLUG)"
	@TITLE="$(shell echo '$(SLUG)' | sed 's/-/ /g; s/\b\(.\)/\U\1/g')"; \
	DATE="$(shell date +%Y-%m-%d)"; \
	printf '%s\n' \
	  '---' \
	  "title: \"$$TITLE\"" \
	  "date: $$DATE" \
	  'description: ""' \
	  'tags: []' \
	  'categories: []' \
	  'draft: false' \
	  '---' \
	  '' \
	  'Your content here.' > "content/blog/$(SLUG)/index.md"
	@echo "Created content/blog/$(SLUG)/index.md"

# Live dev server (http://localhost:1313/posts/)
serve:
	docker compose up

# Build the site in the container
build:
	docker compose run --rm --no-deps -T hugo hugo --minify

# Push everything to main; the GitHub Action builds and publishes
deploy:
	git add -A
	git commit -m "Update: $$(date +'%Y-%m-%d %H:%M')" || echo "Nothing to commit"
	git push

help:
	@echo "make new-post SLUG=x   create a new post"
	@echo "make serve             dev server at localhost:1313/posts/"
	@echo "make build             build site in container"
	@echo "make deploy            commit + push (auto-deploys to GitHub Pages)"