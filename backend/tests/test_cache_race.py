def test_write_during_stats_rebuild_cannot_restore_stale_cache(api):
    _, app, cache = api
    service = app.state.service
    real_stats = service.repository.stats

    def interrupted_stats():
        result = real_stats()
        cache.invalidate_stats()  # a write commits while this read is still computing
        return result

    service.repository.stats = interrupted_stats
    _, first_state = service.stats()
    service.repository.stats = real_stats
    _, second_state = service.stats()

    assert first_state == "MISS"
    assert second_state == "MISS"
