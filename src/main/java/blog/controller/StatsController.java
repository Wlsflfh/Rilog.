package blog.controller;

import blog.auth.principal.AuthenticatedUser;
import blog.controller.dto.DashboardStatsResponse;
import blog.service.DashboardStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/stats")
@RequiredArgsConstructor
public class StatsController {

    private final DashboardStatsService dashboardStatsService;

    @GetMapping("/me")
    public ResponseEntity<DashboardStatsResponse> findMine(@AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(dashboardStatsService.getStats(user.userId()));
    }
}
