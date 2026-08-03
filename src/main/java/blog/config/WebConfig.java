package blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class  WebConfig implements WebMvcConfigurer {

    private static final Path UPLOAD_DIRECTORY = Path.of("src/main/resources/static/uploads");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(UPLOAD_DIRECTORY.toUri().toString());
    }
}
