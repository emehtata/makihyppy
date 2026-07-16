IMAGE ?= makihyppy:latest
CONTAINER ?= makihyppy
PORT ?= 8877

.PHONY: build start stop remove restart logs shell status

build:
	docker build --tag $(IMAGE) .

start: build
	-docker rm --force $(CONTAINER)
	docker run --detach --name $(CONTAINER) --publish $(PORT):8877 $(IMAGE)

stop:
	-docker stop $(CONTAINER)

remove:
	-docker rm --force $(CONTAINER)

restart: stop start

logs:
	docker logs --follow $(CONTAINER)

shell:
	docker exec --interactive --tty $(CONTAINER) /bin/sh

status:
	docker ps --filter name=$(CONTAINER)

push:
	docker push $(IMAGE)
